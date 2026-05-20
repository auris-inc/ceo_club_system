// Supabase Edge Function: send-event-notification
//
// 入力 (POST JSON):
//   {
//     kind: 'event_published' | 'event_updated' | 'reminder_attending' | 'reinvite_undecided',
//     eventId: string
//   }
//
// 動作:
//   1. eventId からイベントを取得
//   2. kind に応じて送信対象ユーザーをDBから抽出
//   3. users.expo_push_token を集めて Expo Push API に投げる（100件ずつバッチ）
//
// 認証: SUPABASE_SERVICE_ROLE_KEY 必須 (RLSをバイパスして全会員にアクセスするため)
//   呼び出し元:
//     - admin Next.js API ルート (service role key 持参)
//     - pg_cron (pg_net 経由で service role key 持参)
//
// 注意: Edge Function は Deno 環境。Node.js 互換性に頼らない。

// @ts-nocheck  Denoの型は本リポジトリのTSプロジェクトには含めない
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type NotificationKind =
  | 'event_published'
  | 'event_updated'
  | 'reminder_attending'
  | 'reinvite_undecided';

interface RequestPayload {
  kind: NotificationKind;
  eventId: string;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  channelId?: string;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

function buildMessage(
  kind: NotificationKind,
  eventTitle: string,
  eventDate: string,
): { title: string; body: string } {
  const dateLabel = formatDate(eventDate);
  switch (kind) {
    case 'event_published':
      return {
        title: '新しいイベントが公開されました',
        body: `${eventTitle}（${dateLabel}）`,
      };
    case 'event_updated':
      return {
        title: 'イベント情報が更新されました',
        body: `${eventTitle}（${dateLabel}）の内容をご確認ください`,
      };
    case 'reminder_attending':
      return {
        title: 'イベント開催が近づいています',
        body: `${eventTitle}（${dateLabel}）にご参加予定です。キャンセル期日にご注意ください。`,
      };
    case 'reinvite_undecided':
      return {
        title: '参加をご検討中のイベントがあります',
        body: `${eventTitle}（${dateLabel}）への参加可否をお知らせください。`,
      };
  }
}

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

async function resolveTargetUserIds(
  supabase: ReturnType<typeof createClient>,
  kind: NotificationKind,
  eventId: string,
): Promise<string[]> {
  switch (kind) {
    case 'event_published':
    case 'event_updated': {
      // 全アクティブ会員
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('status_id', '00000000-0000-0000-0000-000000000002');
      if (error) throw error;
      return (data ?? []).map((u: { id: string }) => u.id);
    }
    case 'reminder_attending': {
      // 当該イベントに「参加」表明している会員
      const { data, error } = await supabase
        .from('event_applications')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'attending');
      if (error) throw error;
      return (data ?? []).map((a: { user_id: string }) => a.user_id);
    }
    case 'reinvite_undecided': {
      // 当該イベントに「調整中」と回答している会員
      const { data, error } = await supabase
        .from('event_applications')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'undecided');
      if (error) throw error;
      return (data ?? []).map((a: { user_id: string }) => a.user_id);
    }
  }
}

async function fetchTokens(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from('users')
    .select('expo_push_token')
    .in('id', userIds)
    .not('expo_push_token', 'is', null);
  if (error) throw error;
  return (data ?? [])
    .map((u: { expo_push_token: string | null }) => u.expo_push_token ?? '')
    .filter((t: string) => t.length > 0);
}

async function sendBatchToExpo(messages: ExpoMessage[]) {
  if (messages.length === 0) return { sent: 0, tickets: [] as unknown[] };
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo Push API error: ${response.status} ${text}`);
  }
  const json = await response.json();
  return { sent: messages.length, tickets: json?.data ?? [] };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // 自前の共有シークレット認証
    // (Edge Function 自体は --no-verify-jwt でデプロイし、公開エンドポイントとしておく)
    const expectedSecret = Deno.env.get('NOTIFICATION_SECRET');
    const providedSecret = req.headers.get('x-notification-secret');
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server is not configured' }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = (await req.json()) as RequestPayload;
    if (!body?.kind || !body?.eventId) {
      return new Response(JSON.stringify({ error: 'kind and eventId are required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // 1. イベント取得
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, event_date')
      .eq('id', body.eventId)
      .single();

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    // 2. 対象ユーザー解決
    const userIds = await resolveTargetUserIds(supabase, body.kind, event.id);
    const tokens = await fetchTokens(supabase, userIds);

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ targetUsers: userIds.length, tokensFound: 0, sent: 0 }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    // 3. メッセージ組み立て
    const { title, body: msgBody } = buildMessage(
      body.kind,
      event.title,
      event.event_date,
    );
    const messages: ExpoMessage[] = tokens.map((to) => ({
      to,
      title,
      body: msgBody,
      data: { eventId: event.id, kind: body.kind },
      sound: 'default',
      channelId: 'default',
    }));

    // 4. 100件ずつバッチ送信
    let sentTotal = 0;
    const tickets: unknown[] = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const result = await sendBatchToExpo(batch);
      sentTotal += result.sent;
      tickets.push(...result.tickets);
    }

    return new Response(
      JSON.stringify({
        targetUsers: userIds.length,
        tokensFound: tokens.length,
        sent: sentTotal,
        ticketsSample: tickets.slice(0, 5),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('send-event-notification error:', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'unknown error' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
});

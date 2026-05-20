import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '../_utils';

// admin → Supabase Edge Function (send-event-notification) のラッパー。
// 管理者セッション必須。実際の送信処理は Edge Function 側で行う。

type Kind =
  | 'event_published'
  | 'event_updated'
  | 'reminder_attending'
  | 'reinvite_undecided';

const ALLOWED_KINDS: Kind[] = [
  'event_published',
  'event_updated',
  'reminder_attending',
  'reinvite_undecided',
];

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession(request);

    const body = (await request.json()) as { kind?: Kind; eventId?: string };

    if (!body?.kind || !body?.eventId) {
      return NextResponse.json(
        { error: 'kind と eventId は必須です' },
        { status: 400 },
      );
    }

    if (!ALLOWED_KINDS.includes(body.kind)) {
      return NextResponse.json(
        { error: `不正な kind: ${body.kind}` },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const notificationSecret = process.env.NOTIFICATION_SHARED_SECRET || '';

    if (!supabaseUrl || !notificationSecret) {
      return NextResponse.json(
        {
          error:
            'サーバー設定が不正です（NEXT_PUBLIC_SUPABASE_URL / NOTIFICATION_SHARED_SECRET 不足）',
        },
        { status: 500 },
      );
    }

    const edgeUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-event-notification`;

    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-notification-secret': notificationSecret,
      },
      body: JSON.stringify({ kind: body.kind, eventId: body.eventId }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: result?.error ?? `Edge Function error (${response.status})`,
          status: response.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? '通知送信に失敗しました' },
      { status: 500 },
    );
  }
}

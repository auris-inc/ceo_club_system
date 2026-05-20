import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabaseService';
import { requireAdminSession, validateCircleSelection } from '../../_utils';

type CreateMemberBody = {
  email: string;
  password: string;
  full_name: string;
  company_name?: string;
  district?: string;
  gender?: string;
  birth_date?: string;
  status_id: string;
  circle_ids?: string[];
};

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceSupabase();

  // 小規模運用を想定し、ページングしながら探索（email重複時の復旧用）
  let page = 1;
  const perPage = 200;
  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
    if (hit?.id) return hit.id;

    if (data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession(request);
    const supabase = createServiceSupabase();

    const body = (await request.json()) as CreateMemberBody;

    if (!body.email || !body.password || !body.full_name || !body.status_id) {
      return NextResponse.json(
        { error: 'メールアドレス・パスワード・氏名・ステータスは必須です' },
        { status: 400 }
      );
    }

    await validateCircleSelection(body.circle_ids ?? []);

    let authUserId: string | null = null;

    // 1) Authユーザーを作成（既に存在する場合は更新へフォールバック）
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // admin作成なら即ログイン可能にする
      user_metadata: {
        full_name: body.full_name,
        terms_agreed: true,
      },
    });

    if (createError) {
      // 既存メールの場合は auth ユーザーを探してパスワード等を更新
      authUserId = await findAuthUserIdByEmail(body.email);
      if (!authUserId) {
        throw createError;
      }

      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUserId, {
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.full_name,
          terms_agreed: true,
        },
      });
      if (updateAuthError) throw updateAuthError;
    } else {
      authUserId = created.user?.id ?? null;
    }

    if (!authUserId) throw new Error('ユーザー作成に失敗しました');

    // 2) usersテーブルを upsert（トリガーがあっても、確実に正しい値で揃える）
    const profile = {
      id: authUserId,
      email: body.email,
      password_hash: '', // Supabase Authで管理
      full_name: body.full_name,
      company_name: body.company_name || null,
      district: body.district || null,
      gender: body.gender || null,
      birth_date: body.birth_date || null,
      status_id: body.status_id,
      terms_agreed: true,
    };

    const { error: upsertError } = await supabase
      .from('users')
      .upsert(profile, { onConflict: 'id' });
    if (upsertError) throw upsertError;

    // 3) サークル紐付け（指定がある場合は一旦削除して入れ直し）
    const circleIds = body.circle_ids ?? [];
    await supabase.from('user_circles').delete().eq('user_id', authUserId);

    if (circleIds.length > 0) {
      const inserts = circleIds.map((circleId) => ({
        user_id: authUserId,
        circle_id: circleId,
      }));
      const { error: circleError } = await supabase.from('user_circles').insert(inserts);
      if (circleError) throw circleError;
    }

    return NextResponse.json({ id: authUserId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? '会員作成に失敗しました' },
      { status: 500 }
    );
  }
}



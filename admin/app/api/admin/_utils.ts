import { NextRequest } from 'next/server';
import { createServiceSupabase } from '@/lib/supabaseService';

export type AdminSession = {
  id: string;
  email: string;
  name?: string;
};

export async function requireAdminSession(request: NextRequest): Promise<AdminSession> {
  const raw = request.headers.get('x-admin-session');
  if (!raw) throw new Error('管理者セッションがありません。再ログインしてください。');

  let decoded: string;
  try {
    decoded = decodeURIComponent(escape(atob(raw)));
  } catch {
    throw new Error('管理者セッションが壊れています。再ログインしてください。');
  }

  let parsed: AdminSession | null = null;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error('管理者セッションが壊れています。再ログインしてください。');
  }

  if (!parsed?.id || !parsed?.email) {
    throw new Error('管理者セッションが不正です。再ログインしてください。');
  }

  // DB上でも有効な管理者か確認（最低限の防御）
  const supabase = createServiceSupabase();
  const { data: admin, error } = await supabase
    .from('administrators')
    .select('id, email, name, is_active')
    .eq('id', parsed.id)
    .eq('email', parsed.email)
    .eq('is_active', true)
    .single();

  if (error || !admin) {
    throw new Error('管理者権限が確認できません。再ログインしてください。');
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name ?? undefined,
  };
}

// 地区会タグは会員あたり最大2つまで。指定された circle_ids が上限を超えていれば例外。
export async function validateCircleSelection(circleIds: string[]): Promise<void> {
  if (circleIds.length === 0) return;

  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .from('circles')
    .select('id, category')
    .in('id', circleIds);

  if (error) throw new Error('タグの検証に失敗しました');

  const districtCount = (data ?? []).filter((c: any) => c.category === 'district').length;
  if (districtCount > 2) {
    throw new Error('地区会は最大2つまで選択できます');
  }
}

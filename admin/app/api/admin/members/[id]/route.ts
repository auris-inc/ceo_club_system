import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabaseService';
import { requireAdminSession, validateCircleSelection } from '../../_utils';

type PatchBody = Partial<{
  full_name: string;
  company_name: string | null;
  district: string | null;
  gender: string | null;
  birth_date: string | null;
  status_id: string;
  circle_ids: string[];
}>;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const supabase = createServiceSupabase();

    const { data, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        full_name,
        profile_image_url,
        gender,
        birth_date,
        company_name,
        district,
        status_id,
        created_at,
        updated_at,
        status:member_statuses(id, name, description),
        user_circles(
          circle:circles(id, name)
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    const memberData: any = data;
    const circles =
      memberData?.user_circles?.map((uc: any) => uc.circle).filter(Boolean) ?? [];

    return NextResponse.json({
      member: {
        ...memberData,
        circles,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? '取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id } = await context.params;
    const supabase = createServiceSupabase();
    const body = (await request.json()) as PatchBody;

    const updateData: Record<string, any> = {};
    if (typeof body.full_name === 'string') updateData.full_name = body.full_name;
    if (body.company_name !== undefined) updateData.company_name = body.company_name;
    if (body.district !== undefined) updateData.district = body.district;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.birth_date !== undefined) updateData.birth_date = body.birth_date;
    if (typeof body.status_id === 'string') updateData.status_id = body.status_id;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase.from('users').update(updateData).eq('id', id);
      if (updateError) throw updateError;
    }

    if (Array.isArray(body.circle_ids)) {
      await validateCircleSelection(body.circle_ids);
      await supabase.from('user_circles').delete().eq('user_id', id);
      if (body.circle_ids.length > 0) {
        const inserts = body.circle_ids.map((circleId) => ({
          user_id: id,
          circle_id: circleId,
        }));
        const { error: circleError } = await supabase.from('user_circles').insert(inserts);
        if (circleError) throw circleError;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? '更新に失敗しました' },
      { status: 500 }
    );
  }
}



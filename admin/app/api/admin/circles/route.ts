import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabaseService';
import { requireAdminSession } from '../_utils';

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession(request);
    const supabase = createServiceSupabase();

    const { data, error } = await supabase
      .from('circles')
      .select('id, name, category, is_active, sort_order')
      .eq('is_active', true)
      .order('category')
      .order('sort_order');

    if (error) throw error;
    return NextResponse.json({ circles: data ?? [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? '取得に失敗しました' },
      { status: 500 }
    );
  }
}



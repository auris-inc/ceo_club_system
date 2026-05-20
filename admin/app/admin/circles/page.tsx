'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';

interface Circle {
  id: string;
  name: string;
  category: 'district' | 'club';
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

type CategoryFilter = 'all' | 'district' | 'club';

const CATEGORY_LABEL: Record<Circle['category'], string> = {
  district: '地区会',
  club: '部活動',
};

const CATEGORY_BADGE_CLASS: Record<Circle['category'], string> = {
  district: 'bg-blue-100 text-blue-800',
  club: 'bg-purple-100 text-purple-800',
};

export default function CirclesPage() {
  const router = useRouter();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) {
      router.push('/admin/login');
      return;
    }

    fetchCircles();
  }, [router]);

  const fetchCircles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('circles')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCircles((data as Circle[]) || []);
    } catch (error) {
      console.error('Error fetching circles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('circles')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      alert('ステータスを更新しました');
      fetchCircles();
    } catch (error: any) {
      alert('更新に失敗しました: ' + error.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;

    try {
      const { error } = await supabase.from('circles').delete().eq('id', id);

      if (error) throw error;

      alert('削除しました');
      fetchCircles();
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const visibleCircles = useMemo(() => {
    if (filter === 'all') return circles;
    return circles.filter((c) => c.category === filter);
  }, [circles, filter]);

  const counts = useMemo(
    () => ({
      all: circles.length,
      district: circles.filter((c) => c.category === 'district').length,
      club: circles.filter((c) => c.category === 'club').length,
    }),
    [circles],
  );

  const tabs: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: `すべて (${counts.all})` },
    { value: 'district', label: `地区会 (${counts.district})` },
    { value: 'club', label: `部活動 (${counts.club})` },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  filter === tab.value
                    ? 'text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                style={
                  filter === tab.value ? { backgroundColor: '#243266' } : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            href="/admin/circles/new"
            className="px-4 py-2 text-white rounded hover:opacity-90"
            style={{ backgroundColor: '#243266' }}
          >
            新規作成
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">読み込み中...</div>
          ) : visibleCircles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              タグが見つかりませんでした
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    表示順
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タグ名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleCircles.map((circle) => (
                  <tr key={circle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${CATEGORY_BADGE_CLASS[circle.category]}`}
                      >
                        {CATEGORY_LABEL[circle.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {circle.sort_order}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {circle.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          circle.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {circle.is_active ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(circle.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/circles/${circle.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                          style={{ color: '#243266' }}
                        >
                          編集
                        </Link>
                        <button
                          onClick={() =>
                            handleToggleActive(circle.id, circle.is_active)
                          }
                          className={`${
                            circle.is_active
                              ? 'text-orange-600 hover:text-orange-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {circle.is_active ? '無効化' : '有効化'}
                        </button>
                        <button
                          onClick={() => handleDelete(circle.id, circle.name)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

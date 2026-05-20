'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';

type Category = 'district' | 'club';

interface Circle {
  id: string;
  name: string;
  category: Category;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_LABEL: Record<Category, string> = {
  district: '地区会',
  club: '部活動',
};

export default function CircleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const circleId = params.id as string;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    category: Category;
    sort_order: number;
    is_active: boolean;
  }>({
    name: '',
    category: 'club',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) {
      router.push('/admin/login');
      return;
    }

    fetchCircle();
  }, [router, circleId]);

  const fetchCircle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('circles')
        .select('*')
        .eq('id', circleId)
        .single();

      if (error) throw error;

      const c = data as Circle;
      setCircle(c);
      setFormData({
        name: c.name,
        category: c.category,
        sort_order: c.sort_order,
        is_active: c.is_active,
      });
    } catch (error) {
      console.error('Error fetching circle:', error);
      alert('タグ情報の取得に失敗しました');
      router.push('/admin/circles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('circles')
        .update(formData)
        .eq('id', circleId);

      if (error) throw error;

      alert('更新しました');
      setEditMode(false);
      fetchCircle();
    } catch (error: any) {
      alert('更新に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`「${circle?.name}」を削除しますか？`)) return;

    try {
      const { error } = await supabase
        .from('circles')
        .delete()
        .eq('id', circleId);

      if (error) throw error;

      alert('削除しました');
      router.push('/admin/circles');
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">読み込み中...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!circle) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center text-gray-500">
              タグが見つかりませんでした
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: '#243266' }}>
              タグ詳細
            </h2>
            {!editMode && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 text-white rounded hover:opacity-90"
                  style={{ backgroundColor: '#243266' }}
                >
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  削除
                </button>
              </div>
            )}
          </div>

          {editMode ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* カテゴリー */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリー <span className="text-gray-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value="district"
                        checked={formData.category === 'district'}
                        onChange={() =>
                          setFormData({ ...formData, category: 'district' })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900">
                        地区会（会員は最大2つまで選択可）
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value="club"
                        checked={formData.category === 'club'}
                        onChange={() =>
                          setFormData({ ...formData, category: 'club' })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900">
                        部活動（上限なし）
                      </span>
                    </label>
                  </div>
                </div>

                {/* タグ名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    タグ名 <span className="text-gray-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>

                {/* 表示順 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    表示順
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>

                {/* 有効/無効 */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      有効
                    </span>
                  </label>
                </div>

                {/* ボタン */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 text-white rounded hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#243266' }}
                  >
                    {saving ? '更新中...' : '更新'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setFormData({
                        name: circle.name,
                        category: circle.category,
                        sort_order: circle.sort_order,
                        is_active: circle.is_active,
                      });
                    }}
                    className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリー
                </label>
                <div className="text-gray-900">
                  {CATEGORY_LABEL[circle.category]}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タグ名
                </label>
                <div className="text-gray-900">{circle.name}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  表示順
                </label>
                <div className="text-gray-900">{circle.sort_order}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    circle.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {circle.is_active ? '有効' : '無効'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  作成日
                </label>
                <div className="text-gray-900">{formatDate(circle.created_at)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

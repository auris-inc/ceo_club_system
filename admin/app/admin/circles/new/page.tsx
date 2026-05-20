'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/AdminLayout';

type Category = 'district' | 'club';

function NewCircleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory: Category =
    searchParams.get('category') === 'district' ? 'district' : 'club';

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    category: Category;
    sort_order: number;
    is_active: boolean;
  }>({
    name: '',
    category: initialCategory,
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (!session) {
      router.push('/admin/login');
      return;
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('circles').insert([formData]);

      if (error) throw error;

      alert('タグを作成しました');
      router.push('/admin/circles');
    } catch (error: any) {
      alert('作成に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#243266' }}>
            新規タグ作成
          </h2>

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
                  placeholder="タグ名を入力"
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
                      setFormData({ ...formData, is_active: e.target.checked })
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
                  {saving ? '作成中...' : '作成'}
                </button>
                <Link
                  href="/admin/circles"
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  キャンセル
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function NewCirclePage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <NewCircleForm />
    </Suspense>
  );
}

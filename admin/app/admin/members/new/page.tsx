'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

export default function NewMemberPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [circles, setCircles] = useState<
    { id: string; name: string; category: 'district' | 'club' }[]
  >([]);
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    district: '',
    gender: '',
    birth_date: '',
    status_id: '00000000-0000-0000-0000-000000000002', // active
  });

  useEffect(() => {
    // セッション確認
    const session = localStorage.getItem('admin_session');
    if (!session) {
      router.push('/admin/login');
      return;
    }

    fetchStatuses();
    fetchCircles();
  }, [router]);

  const fetchStatuses = async () => {
    try {
      const session = localStorage.getItem('admin_session');
      const res = await fetch('/api/admin/member-statuses', {
        headers: {
          'x-admin-session': session ? btoa(unescape(encodeURIComponent(session))) : '',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ステータス取得に失敗しました');
      setStatuses((json.statuses || []).map((s: any) => ({ id: s.id, name: s.name })));
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  const fetchCircles = async () => {
    try {
      const session = localStorage.getItem('admin_session');
      const res = await fetch('/api/admin/circles', {
        headers: {
          'x-admin-session': session ? btoa(unescape(encodeURIComponent(session))) : '',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'サークル取得に失敗しました');
      setCircles(
        (json.circles || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          category: (c.category as 'district' | 'club') ?? 'club',
        })),
      );
    } catch (error) {
      console.error('Error fetching circles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.full_name) {
      alert('メールアドレス、パスワード、氏名は必須です');
      return;
    }

    try {
      setSaving(true);

      const session = localStorage.getItem('admin_session');
      const res = await fetch('/api/admin/members/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': session ? btoa(unescape(encodeURIComponent(session))) : '',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          company_name: formData.company_name || undefined,
          district: formData.district || undefined,
          gender: formData.gender || undefined,
          birth_date: formData.birth_date || undefined,
          status_id: formData.status_id,
          circle_ids: selectedCircles,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '会員作成に失敗しました');

      alert('会員を作成しました');
      router.push(`/admin/members/${json.id}`);
    } catch (error: any) {
      console.error('Error creating member:', error);
      alert('会員作成に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = (statusName: string) => {
    switch (statusName) {
      case 'active':
        return '有効';
      case 'pending':
        return '承認待ち';
      case 'suspended':
        return '停止中';
      case 'rejected':
        return '却下';
      default:
        return statusName;
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            {/* 必須項目 */}
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ color: '#243266' }}>
                必須項目
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス <span className="text-gray-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    パスワード <span className="text-gray-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    氏名 <span className="text-gray-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={formData.status_id}
                    onChange={(e) =>
                      setFormData({ ...formData, status_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  >
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {getStatusLabel(status.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 任意項目 */}
            <div>
              <h2 className="text-xl font-bold mb-4" style={{ color: '#243266' }}>
                任意項目
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    会社名
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    地区会
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性別
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  >
                    <option value="">選択してください</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">回答しない</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    生年月日
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>
              </div>
            </div>

            {/* 会員タグ */}
            {(() => {
              const districtCircles = circles.filter((c) => c.category === 'district');
              const clubCircles = circles.filter((c) => c.category === 'club');
              const selectedDistrictCount = selectedCircles.filter((id) =>
                districtCircles.some((c) => c.id === id),
              ).length;

              const toggleCircle = (
                circle: { id: string; category: 'district' | 'club' },
                checked: boolean,
              ) => {
                if (checked) {
                  if (circle.category === 'district' && selectedDistrictCount >= 2) {
                    alert('地区会は最大2つまで選択できます');
                    return;
                  }
                  setSelectedCircles([...selectedCircles, circle.id]);
                } else {
                  setSelectedCircles(selectedCircles.filter((id) => id !== circle.id));
                }
              };

              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: '#243266' }}>
                      地区会
                    </h2>
                    <p className="text-sm text-gray-500 mb-3">
                      オフィスやご自宅のご住所などゆかりのある地域2つまでお選びできます
                    </p>
                    {districtCircles.length === 0 ? (
                      <p className="text-sm text-gray-400">地区会タグはまだ登録されていません</p>
                    ) : (
                      <div className="space-y-2">
                        {districtCircles.map((circle) => {
                          const checked = selectedCircles.includes(circle.id);
                          const disabled =
                            !checked && selectedDistrictCount >= 2;
                          return (
                            <label
                              key={circle.id}
                              className={`flex items-center ${disabled ? 'opacity-50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) => toggleCircle(circle, e.target.checked)}
                                className="mr-2"
                              />
                              <span className="text-gray-900">{circle.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold mb-2" style={{ color: '#243266' }}>
                      部活動
                    </h2>
                    {clubCircles.length === 0 ? (
                      <p className="text-sm text-gray-400">部活動タグはまだ登録されていません</p>
                    ) : (
                      <div className="space-y-2">
                        {clubCircles.map((circle) => (
                          <label key={circle.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedCircles.includes(circle.id)}
                              onChange={(e) => toggleCircle(circle, e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-gray-900">{circle.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

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
                href="/admin/members"
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                キャンセル
              </Link>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}


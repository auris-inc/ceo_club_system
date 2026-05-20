'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

interface User {
  id: string;
  email: string;
  full_name: string;
  profile_image_url?: string;
  gender?: string;
  birth_date?: string;
  company_name?: string;
  district?: string;
  status_id: string;
  status?: {
    id: string;
    name: string;
    description?: string;
  };
  created_at: string;
  updated_at: string;
  circles?: {
    id: string;
    name: string;
  }[];
}

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = (params?.id as string | undefined) || '';

  const [member, setMember] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [circles, setCircles] = useState<
    { id: string; name: string; category: 'district' | 'club' }[]
  >([]);
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);

  // 編集用の状態
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company_name: '',
    district: '',
    gender: '',
    birth_date: '',
    status_id: '',
  });

  useEffect(() => {
    // セッション確認
    const session = localStorage.getItem('admin_session');
    if (!session) {
      router.push('/admin/login');
      return;
    }

    if (!memberId || memberId === 'undefined') {
      // ルーティングがまだ確定していない場合は何もしない
      return;
    }

    fetchStatuses();
    fetchCircles();
    fetchMember();
  }, [router, memberId]);

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

  const fetchMember = async () => {
    try {
      setLoading(true);
      const session = localStorage.getItem('admin_session');
      const res = await fetch(`/api/admin/members/${memberId}`, {
        headers: {
          'x-admin-session': session ? btoa(unescape(encodeURIComponent(session))) : '',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '会員取得に失敗しました');

      const memberData = json.member as any;
      const circlesData: { id: string; name: string }[] = memberData.circles || [];
      setSelectedCircles(circlesData.map((c) => c.id));

      setMember(memberData);
      setFormData({
        full_name: memberData.full_name || '',
        email: memberData.email || '',
        company_name: memberData.company_name || '',
        district: memberData.district || '',
        gender: memberData.gender || '',
        birth_date: memberData.birth_date || '',
        status_id: memberData.status_id || '',
      });
    } catch (error) {
      console.error('Error fetching member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('この会員を承認しますか？')) return;

    try {
      setSaving(true);
      const activeStatusId = '00000000-0000-0000-0000-000000000002'; // active

      const session = localStorage.getItem('admin_session');
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': session ? btoa(unescape(encodeURIComponent(session))) : '',
        },
        body: JSON.stringify({ status_id: activeStatusId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '承認に失敗しました');

      alert('会員を承認しました');
      fetchMember();
    } catch (error: any) {
      alert('承認に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('この会員を却下しますか？')) return;

    try {
      setSaving(true);
      const rejectedStatusId = '00000000-0000-0000-0000-000000000004'; // rejected

      const session = localStorage.getItem('admin_session');
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': session ? btoa(unescape(encodeURIComponent(session))) : '',
        },
        body: JSON.stringify({ status_id: rejectedStatusId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '却下に失敗しました');

      alert('会員を却下しました');
      fetchMember();
    } catch (error: any) {
      alert('却下に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const session = localStorage.getItem('admin_session');
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-session': session ? btoa(unescape(encodeURIComponent(session))) : '',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          company_name: formData.company_name || null,
          district: formData.district || null,
          gender: formData.gender || null,
          birth_date: formData.birth_date || null,
          status_id: formData.status_id,
          circle_ids: selectedCircles,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '保存に失敗しました');

      alert('保存しました');
      setEditMode(false);
      fetchMember();
    } catch (error: any) {
      alert('保存に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
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

  if (!member) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center text-gray-500">
              会員が見つかりませんでした
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-6">
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 text-white rounded hover:opacity-90"
              style={{ backgroundColor: '#243266' }}
            >
              編集
            </button>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          {/* 基本情報 */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#243266' }}>
              基本情報
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  氏名
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  />
                ) : (
                  <div className="text-gray-900">{member.full_name}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <div className="text-gray-900">{member.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会社名
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  />
                ) : (
                  <div className="text-gray-900">
                    {member.company_name || '-'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地区会
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  />
                ) : (
                  <div className="text-gray-900">{member.district || '-'}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  性別
                </label>
                {editMode ? (
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  >
                    <option value="">選択してください</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">回答しない</option>
                  </select>
                ) : (
                  <div className="text-gray-900">
                    {member.gender === 'male'
                      ? '男性'
                      : member.gender === 'female'
                      ? '女性'
                      : member.gender === 'other'
                      ? '回答しない'
                      : '-'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  生年月日
                </label>
                {editMode ? (
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  />
                ) : (
                  <div className="text-gray-900">
                    {formatDate(member.birth_date)}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                {editMode ? (
                  <select
                    value={formData.status_id}
                    onChange={(e) =>
                      setFormData({ ...formData, status_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  >
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {getStatusLabel(status.name)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-gray-900">
                    {member.status && getStatusLabel(member.status.name)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 会員タグ */}
          <div className="mb-6">
            {editMode ? (
              (() => {
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
                    setSelectedCircles(
                      selectedCircles.filter((id) => id !== circle.id),
                    );
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
                            const disabled = !checked && selectedDistrictCount >= 2;
                            return (
                              <label
                                key={circle.id}
                                className={`flex items-center ${disabled ? 'opacity-50' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={(e) =>
                                    toggleCircle(circle, e.target.checked)
                                  }
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
                                onChange={(e) =>
                                  toggleCircle(circle, e.target.checked)
                                }
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
              })()
            ) : (
              <div>
                <h2 className="text-xl font-bold mb-4" style={{ color: '#243266' }}>
                  会員タグ
                </h2>
                <div className="text-gray-900">
                  {member.circles && member.circles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {member.circles.map((circle) => (
                        <span
                          key={circle.id}
                          className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                        >
                          {circle.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
            )}
          </div>

          {/* アクション */}
          {member.status?.name === 'pending' && !editMode && (
            <div className="flex gap-4 mb-6">
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                承認
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                却下
              </button>
            </div>
          )}

          {editMode && (
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-white rounded hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#243266' }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  fetchMember();
                }}
                disabled={saving}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          )}

          {/* 登録情報 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <div>登録日: {formatDate(member.created_at)}</div>
              <div>更新日: {formatDate(member.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


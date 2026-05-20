'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RichTextEditor from '@/components/RichTextEditor';
import ImageUpload from '@/components/ImageUpload';
import AdminLayout from '@/components/AdminLayout';

function NewEventPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copyFrom');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    thumbnail_url: '',
    event_date: '',
    start_time: '',
    end_time: '',
    venue: '',
    capacity: '',
    cancel_deadline: '',
    status_id: '00000000-0000-0000-0000-000000000201', // draft
    publish_at: '',
    allow_guest: false,
  });

  useEffect(() => {
    // セッション確認
    const session = localStorage.getItem('admin_session');
    if (!session) {
      router.push('/admin/login');
      return;
    }

    fetchStatuses();
    fetchTags();
    if (copyFromId) {
      fetchEventToCopy(copyFromId);
    }
  }, [router, copyFromId]);

  const fetchStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('event_statuses')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('event_tags')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchEventToCopy = async (eventId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: `${data.title}（コピー）`,
          body: data.body || '',
          thumbnail_url: data.thumbnail_url || '',
          event_date: data.event_date || '',
          start_time: data.start_time || '',
          end_time: data.end_time || '',
          venue: data.venue || '',
          capacity: data.capacity ? String(data.capacity) : '',
          cancel_deadline: data.cancel_deadline
            ? new Date(data.cancel_deadline).toISOString().slice(0, 16)
            : '',
          status_id: '00000000-0000-0000-0000-000000000201', // コピー時は常にdraft
          publish_at: '', // コピー時は公開日時をクリア
          allow_guest: data.allow_guest || false,
        });

        // コピー元のタグも取得
        const { data: tagRelations } = await supabase
          .from('event_event_tags')
          .select('tag_id')
          .eq('event_id', eventId);

        if (tagRelations) {
          setSelectedTagIds(tagRelations.map((r) => r.tag_id));
        }
      }
    } catch (error) {
      console.error('Error fetching event to copy:', error);
      alert('コピー元のイベントの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      alert('タグ名を入力してください');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('event_tags')
        .insert({
          name: newTagName.trim(),
          sort_order: tags.length,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setTags([...tags, data]);
      setSelectedTagIds([...selectedTagIds, data.id]);
      setNewTagName('');
      setShowNewTagInput(false);
    } catch (error: any) {
      alert('タグの作成に失敗しました: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.body || !formData.event_date) {
      alert('タイトル、本文、開催日は必須です');
      return;
    }

    try {
      setSaving(true);
      const session = localStorage.getItem('admin_session');
      if (!session) {
        router.push('/admin/login');
        return;
      }
      const admin = JSON.parse(session);

      const insertData: any = {
        title: formData.title,
        body: formData.body,
        event_date: formData.event_date,
        status_id: formData.status_id,
        allow_guest: formData.allow_guest,
        // 管理者はusersテーブルに存在しないため、created_byはNULLにする
        // created_by: admin.id,
      };

      if (formData.thumbnail_url) {
        insertData.thumbnail_url = formData.thumbnail_url;
      }

      if (formData.start_time) {
        insertData.start_time = formData.start_time;
      }

      if (formData.end_time) {
        insertData.end_time = formData.end_time;
      }

      if (formData.venue) {
        insertData.venue = formData.venue;
      }

      if (formData.capacity) {
        insertData.capacity = parseInt(formData.capacity, 10);
      }

      if (formData.cancel_deadline) {
        insertData.cancel_deadline = formData.cancel_deadline;
      }

      if (formData.publish_at) {
        insertData.publish_at = formData.publish_at;
      }

      const { data, error } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // タグの関連付け
      if (selectedTagIds.length > 0) {
        const tagRelations = selectedTagIds.map((tagId) => ({
          event_id: data.id,
          tag_id: tagId,
        }));

        const { error: tagError } = await supabase
          .from('event_event_tags')
          .insert(tagRelations);

        if (tagError) throw tagError;
      }

      alert('イベントを作成しました');
      router.push(`/admin/events/${data.id}`);
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert('イベント作成に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = (statusName: string) => {
    switch (statusName) {
      case 'published':
        return '公開中';
      case 'draft':
        return '下書き';
      case 'closed':
        return '終了';
      case 'cancelled':
        return 'キャンセル';
      default:
        return statusName;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">読み込み中...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {copyFromId && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              イベントをコピーしています。必要に応じて内容を編集してください。
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左側: 編集フォーム */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold" style={{ color: '#243266' }}>
                  編集
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'edit'
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'preview'
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    プレビュー
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タイトル <span className="text-gray-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    本文 <span className="text-gray-500">*</span>
                  </label>
                  {viewMode === 'edit' ? (
                    <RichTextEditor
                      content={formData.body}
                      onChange={(content) =>
                        setFormData({ ...formData, body: content })
                      }
                      placeholder="本文を入力してください..."
                    />
                  ) : (
                    <div
                      className="border border-gray-300 rounded-md p-4 min-h-[300px] bg-white prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: formData.body || '<p class="text-gray-400">プレビューが表示されます</p>' }}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    サムネイル画像
                  </label>
                  <ImageUpload
                    currentUrl={formData.thumbnail_url}
                    onUploadComplete={(url) =>
                      setFormData({ ...formData, thumbnail_url: url })
                    }
                    bucketName="thumbnails"
                    folder="events"
                  />
                </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開催日 <span className="text-gray-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) =>
                    setFormData({ ...formData, event_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開催場所
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) =>
                    setFormData({ ...formData, venue: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時刻
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了時刻
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  定員
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  placeholder="空欄で無制限"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  キャンセル期限
                </label>
                <input
                  type="datetime-local"
                  value={formData.cancel_deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, cancel_deadline: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status_id}
                  onChange={(e) =>
                    setFormData({ ...formData, status_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {getStatusLabel(status.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  公開日時
                </label>
                <input
                  type="datetime-local"
                  value={formData.publish_at}
                  onChange={(e) =>
                    setFormData({ ...formData, publish_at: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_guest}
                  onChange={(e) =>
                    setFormData({ ...formData, allow_guest: e.target.checked })
                  }
                  className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  非会員申込み許可
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTagIds([...selectedTagIds, tag.id]);
                        } else {
                          setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                        }
                      }}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2"
                    />
                    <span className="text-sm text-gray-700">{tag.name}</span>
                  </label>
                ))}
              </div>
              {showNewTagInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="新しいタグ名"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    className="px-4 py-2 text-white rounded hover:opacity-90"
                    style={{ backgroundColor: '#243266' }}
                  >
                    追加
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTagInput(false);
                      setNewTagName('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewTagInput(true)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                >
                  + 新しいタグを追加
                </button>
              )}
            </div>

                <div className="flex gap-4 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 text-white rounded hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#243266' }}
                  >
                    {saving ? '作成中...' : '作成'}
                  </button>
                  <Link
                    href="/admin/events"
                    className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                  >
                    キャンセル
                  </Link>
                </div>
              </div>
            </div>

            {/* 右側: プレビュー */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#243266' }}>
                プレビュー
              </h2>
              <div className="border border-gray-300 rounded-md p-6 bg-gray-50">
                {formData.thumbnail_url && (
                  <img
                    src={formData.thumbnail_url}
                    alt={formData.title || 'サムネイル'}
                    className="w-full h-auto rounded mb-4"
                  />
                )}
                <h1 className="text-2xl font-bold mb-4 text-gray-900">
                  {formData.title || 'タイトルが表示されます'}
                </h1>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: formData.body || '<p class="text-gray-400">本文が表示されます</p>',
                  }}
                />
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div>
                    <strong>開催日:</strong> {formData.event_date ? formatDate(formData.event_date) : '-'}
                  </div>
                  {formData.start_time && (
                    <div>
                      <strong>開始時刻:</strong> {formData.start_time}
                    </div>
                  )}
                  {formData.end_time && (
                    <div>
                      <strong>終了時刻:</strong> {formData.end_time}
                    </div>
                  )}
                  {formData.venue && (
                    <div>
                      <strong>開催場所:</strong> {formData.venue}
                    </div>
                  )}
                  {formData.capacity && (
                    <div>
                      <strong>定員:</strong> {formData.capacity}人
                    </div>
                  )}
                  {formData.publish_at && (
                    <div>
                      <strong>公開日時:</strong> {formatDateTime(formData.publish_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">読み込み中...</div>
          </div>
        </div>
      </AdminLayout>
    }>
      <NewEventPageContent />
    </Suspense>
  );
}
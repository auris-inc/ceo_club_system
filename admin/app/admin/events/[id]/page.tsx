'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RichTextEditor from '@/components/RichTextEditor';
import ImageUpload from '@/components/ImageUpload';
import AdminLayout from '@/components/AdminLayout';

interface Event {
  id: string;
  title: string;
  body: string;
  thumbnail_url?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  capacity?: number;
  cancel_deadline?: string;
  status_id: string;
  status?: {
    id: string;
    name: string;
  };
  publish_at?: string;
  allow_guest: boolean;
  created_at: string;
  updated_at: string;
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const isNew = eventId === 'new';

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [editMode, setEditMode] = useState(isNew);
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
  const [originalStatusId, setOriginalStatusId] = useState<string>('');
  const [notifyOnUpdate, setNotifyOnUpdate] = useState(false);
  const PUBLISHED_STATUS_ID = '00000000-0000-0000-0000-000000000202';

  useEffect(() => {
    // セッション確認
    const session = localStorage.getItem('admin_session');
    if (!session) {
      router.push('/admin/login');
      return;
    }

    fetchStatuses();
    fetchTags();
    if (!isNew) {
      fetchEvent();
    } else {
      setLoading(false);
    }
  }, [router, eventId]);

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

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          status:event_statuses(id, name)
        `)
        .eq('id', eventId)
        .single();

      if (error) throw error;

      setEvent(data as any);
      setOriginalStatusId(data.status_id || '');
      setFormData({
        title: data.title || '',
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
        status_id: data.status_id || '00000000-0000-0000-0000-000000000201',
        publish_at: data.publish_at
          ? new Date(data.publish_at).toISOString().slice(0, 16)
          : '',
        allow_guest: data.allow_guest || false,
      });

      // タグの取得
      const { data: tagRelations } = await supabase
        .from('event_event_tags')
        .select('tag_id')
        .eq('event_id', eventId);

      if (tagRelations) {
        setSelectedTagIds(tagRelations.map((r) => r.tag_id));
      }
    } catch (error) {
      console.error('Error fetching event:', error);
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

  const handleSave = async () => {
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

      const updateData: any = {
        title: formData.title,
        body: formData.body,
        event_date: formData.event_date,
        status_id: formData.status_id,
        allow_guest: formData.allow_guest,
      };

      if (formData.thumbnail_url) {
        updateData.thumbnail_url = formData.thumbnail_url;
      } else {
        updateData.thumbnail_url = null;
      }

      if (formData.start_time) {
        updateData.start_time = formData.start_time;
      } else {
        updateData.start_time = null;
      }

      if (formData.end_time) {
        updateData.end_time = formData.end_time;
      } else {
        updateData.end_time = null;
      }

      if (formData.venue) {
        updateData.venue = formData.venue;
      } else {
        updateData.venue = null;
      }

      if (formData.capacity) {
        updateData.capacity = parseInt(formData.capacity, 10);
      } else {
        updateData.capacity = null;
      }

      if (formData.cancel_deadline) {
        updateData.cancel_deadline = formData.cancel_deadline;
      } else {
        updateData.cancel_deadline = null;
      }

      if (formData.publish_at) {
        updateData.publish_at = formData.publish_at;
      } else {
        updateData.publish_at = null;
      }

      let savedEventId = eventId;
      if (isNew) {
        // 管理者はusersテーブルに存在しないため、created_byはNULLにする
        // updateData.created_by = admin.id;
        const { data, error } = await supabase
          .from('events')
          .insert(updateData)
          .select()
          .single();

        if (error) throw error;
        savedEventId = data.id;
      } else {
        const { error } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', eventId);

        if (error) throw error;
      }

      // タグの関連付けを更新
      // 既存の関連を削除
      const { error: deleteError } = await supabase
        .from('event_event_tags')
        .delete()
        .eq('event_id', savedEventId);

      if (deleteError) throw deleteError;

      // 新しい関連を追加
      if (selectedTagIds.length > 0) {
        const tagRelations = selectedTagIds.map((tagId) => ({
          event_id: savedEventId,
          tag_id: tagId,
        }));

        const { error: insertError } = await supabase
          .from('event_event_tags')
          .insert(tagRelations);

        if (insertError) throw insertError;
      }

      // 通知判定
      // - 新規作成: 公開ステータスかつ notifyOnUpdate ON → event_published
      // - 既存編集 + draft→published に変わった: 初公開とみなして event_published
      // - 既存編集 + 既に公開済みで notifyOnUpdate ON → event_updated
      const isPublished = formData.status_id === PUBLISHED_STATUS_ID;
      let notifyKind: 'event_published' | 'event_updated' | null = null;
      if (isPublished) {
        if (isNew) {
          if (notifyOnUpdate) notifyKind = 'event_published';
        } else if (originalStatusId !== PUBLISHED_STATUS_ID) {
          if (notifyOnUpdate) notifyKind = 'event_published';
        } else if (notifyOnUpdate) {
          notifyKind = 'event_updated';
        }
      }

      let notifyResult = '';
      if (notifyKind) {
        try {
          const sessionRaw = localStorage.getItem('admin_session') ?? '';
          const res = await fetch('/api/admin/notifications', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-admin-session': btoa(unescape(encodeURIComponent(sessionRaw))),
            },
            body: JSON.stringify({ kind: notifyKind, eventId: savedEventId }),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            notifyResult = `\n通知送信に失敗: ${json?.error ?? res.status}`;
          } else {
            notifyResult = `\n通知送信完了: ${json?.sent ?? 0}件`;
          }
        } catch (notifyErr: any) {
          notifyResult = `\n通知送信エラー: ${notifyErr?.message ?? notifyErr}`;
        }
      }

      if (isNew) {
        alert('イベントを作成しました' + notifyResult);
        router.push(`/admin/events/${savedEventId}`);
      } else {
        alert('保存しました' + notifyResult);
        setEditMode(false);
        setNotifyOnUpdate(false);
        fetchEvent();
      }
    } catch (error: any) {
      console.error('Error saving event:', error);
      alert('保存に失敗しました: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm(`「${event.title}」を削除しますか？`)) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);

      if (error) throw error;

      alert('削除しました');
      router.push('/admin/events');
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message);
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

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return '-';
    return timeString;
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

  if (!isNew && !event) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center text-gray-500">
              イベントが見つかりませんでした
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
          {!isNew && !editMode && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 text-white rounded hover:opacity-90"
                style={{ backgroundColor: '#243266' }}
              >
                編集
              </button>
              <button
                onClick={() => router.push(`/admin/events/new?copyFrom=${eventId}`)}
                className="px-4 py-2 text-white rounded hover:opacity-90"
                style={{ backgroundColor: '#a8895b' }}
              >
                コピー
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

              {formData.status_id === PUBLISHED_STATUS_ID && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnUpdate}
                      onChange={(e) => setNotifyOnUpdate(e.target.checked)}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2"
                    />
                    <span className="text-sm font-medium text-blue-900">
                      {isNew || originalStatusId !== PUBLISHED_STATUS_ID
                        ? '公開時に全会員へ通知する'
                        : '変更を全会員へ通知する'}
                    </span>
                  </label>
                  <p className="text-xs text-blue-700 mt-1 ml-6">
                    {isNew || originalStatusId !== PUBLISHED_STATUS_ID
                      ? '保存後、新規イベントとして全会員に Push 通知を送ります'
                      : '保存後、イベント情報の更新を全会員に Push 通知で知らせます'}
                  </p>
                </div>
              )}

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
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 text-white rounded hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#243266' }}
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  {!isNew && (
                    <button
                      onClick={() => {
                        setEditMode(false);
                        fetchEvent();
                      }}
                      disabled={saving}
                      className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                  )}
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
                  className="prose prose-sm max-w-none"
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
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル
                </label>
                <div className="text-gray-900 text-lg font-semibold">
                  {event?.title}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  本文
                </label>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: event?.body || '' }}
                />
              </div>

              {event?.thumbnail_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    サムネイル
                  </label>
                  <img
                    src={event.thumbnail_url}
                    alt={event.title}
                    className="max-w-full h-auto rounded"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開催日
                  </label>
                  <div className="text-gray-900">{formatDate(event?.event_date)}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開催場所
                  </label>
                  <div className="text-gray-900">{event?.venue || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始時刻
                  </label>
                  <div className="text-gray-900">{formatTime(event?.start_time)}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    終了時刻
                  </label>
                  <div className="text-gray-900">{formatTime(event?.end_time)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    定員
                  </label>
                  <div className="text-gray-900">
                    {event?.capacity ? `${event.capacity}人` : '無制限'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    キャンセル期限
                  </label>
                  <div className="text-gray-900">
                    {formatDateTime(event?.cancel_deadline)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <div className="text-gray-900">
                    {event?.status && getStatusLabel(event.status.name)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    公開日時
                  </label>
                  <div className="text-gray-900">
                    {formatDateTime(event?.publish_at)}
                  </div>
                </div>
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    非会員申込み許可
                  </label>
                  <div className="text-gray-900">
                    {event?.allow_guest ? '許可' : '不許可'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タグ
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags
                      .filter((tag) => selectedTagIds.includes(tag.id))
                      .map((tag) => (
                        <span
                          key={tag.id}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                        >
                          {tag.name}
                        </span>
                      ))}
                    {selectedTagIds.length === 0 && (
                      <span className="text-gray-400 text-sm">タグなし</span>
                    )}
                  </div>
                </div>

              {event?.allow_guest && !isNew && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    非会員申込みURL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${eventId}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/apply/${eventId}`;
                        navigator.clipboard.writeText(url);
                        alert('URLをコピーしました');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                      コピー
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    このURLを非会員に共有してください
                  </p>
                </div>
              )}

              <div className="pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  <div>作成日: {formatDateTime(event?.created_at)}</div>
                  <div>更新日: {formatDateTime(event?.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}


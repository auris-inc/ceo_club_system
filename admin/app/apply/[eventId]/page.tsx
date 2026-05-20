'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Event {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  capacity: number | null;
  allow_guest: boolean;
}

export default function GuestApplyPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    company_name: '',
    job_title: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_date, start_time, end_time, venue, capacity, allow_guest')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      if (!data.allow_guest) {
        alert('このイベントは非会員向けの申込みを受け付けていません');
        return;
      }

      setEvent(data as Event);
    } catch (error: any) {
      console.error('Error fetching event:', error);
      alert('イベント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 定員チェック
      if (event?.capacity) {
        const { count } = await supabase
          .from('guest_applications')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'applied');

        const { count: memberCount } = await supabase
          .from('event_applications')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'attending');

        const totalApplications = (count || 0) + (memberCount || 0);
        if (totalApplications >= event.capacity) {
          alert('申し訳ございません。定員に達しました。');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('guest_applications')
        .insert({
          event_id: eventId,
          ...formData,
          status: 'applied',
        });

      if (error) throw error;

      router.push(`/apply/${eventId}/complete`);
    } catch (error: any) {
      alert(error.message || '申込みに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600">イベントが見つかりません</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="text-3xl font-bold text-center" style={{ color: '#243266' }}>
            イベント申込み
          </h2>
          <p className="mt-2 text-center text-gray-600">
            非会員向け申込みフォーム
          </p>
        </div>

        {/* イベント情報 */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              📅 {formatDate(event.event_date)}
              {event.start_time && ` ${formatTime(event.start_time)}`}
              {event.end_time && ` - ${formatTime(event.end_time)}`}
            </div>
            {event.venue && (
              <div>📍 {event.venue}</div>
            )}
            {event.capacity && (
              <div>👥 定員: {event.capacity}名</div>
            )}
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2 text-gray-900 bg-white placeholder:text-gray-500"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2 text-gray-900 bg-white placeholder:text-gray-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                会社名
              </label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2 text-gray-900 bg-white placeholder:text-gray-500"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="job_title" className="block text-sm font-medium text-gray-700">
                役職
              </label>
              <input
                id="job_title"
                name="job_title"
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2 text-gray-900 bg-white placeholder:text-gray-500"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#243266] focus:ring-offset-2 disabled:opacity-50"
              style={{ backgroundColor: '#243266' }}
            >
              {submitting ? '送信中...' : '申し込む'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





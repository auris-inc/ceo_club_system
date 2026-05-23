import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Event, EventApplication } from '../types';
import { useAuthStore } from '../stores/authStore';

export interface ApplicationFilters {
  includePast?: boolean;
  year?: number;
  month?: number;
  keyword?: string;
}

export interface EventWithApplication extends Event {
  application: EventApplication;
}

export function useEventApplications(filters?: ApplicationFilters) {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<EventWithApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchApplications();
    } else {
      setEvents([]);
      setLoading(false);
    }
  }, [filters, user]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // 申込み済タブには「参加」と「調整中」を含める（「不参加」は除外）
      let query = supabase
        .from('event_applications')
        .select('*, events(*)')
        .eq('user_id', user.id)
        .in('status', ['attending', 'undecided'])
        .order('applied_at', { ascending: false });

      const { data: applications, error: appError } = await query;

      if (appError) throw appError;

      let eventsWithApplications: EventWithApplication[] =
        (applications || [])
          .map((app: any) => ({
            ...app.events,
            application: {
              id: app.id,
              event_id: app.event_id,
              user_id: app.user_id,
              status: app.status,
              applied_at: app.applied_at,
              cancelled_at: app.cancelled_at,
            },
          }))
          .filter((e: any) => e.id) || [];

      // 初期表示は未来のイベントのみ
      if (!filters?.includePast) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventsWithApplications = eventsWithApplications.filter(
          (e) => new Date(e.event_date) >= today
        );
      }

      // 年月フィルター
      if (filters?.year && filters?.month) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 0);
        eventsWithApplications = eventsWithApplications.filter((e) => {
          const eventDate = new Date(e.event_date);
          return eventDate >= startDate && eventDate <= endDate;
        });
      } else if (filters?.year) {
        const startDate = new Date(filters.year, 0, 1);
        const endDate = new Date(filters.year, 11, 31);
        eventsWithApplications = eventsWithApplications.filter((e) => {
          const eventDate = new Date(e.event_date);
          return eventDate >= startDate && eventDate <= endDate;
        });
      }

      // キーワード検索
      if (filters?.keyword) {
        const keyword = filters.keyword.toLowerCase();
        eventsWithApplications = eventsWithApplications.filter(
          (e) =>
            e.title.toLowerCase().includes(keyword) ||
            (e.venue && e.venue.toLowerCase().includes(keyword))
        );
      }

      // 日付順にソート
      eventsWithApplications.sort((a, b) => {
        const dateA = new Date(a.event_date);
        const dateB = new Date(b.event_date);
        return dateA.getTime() - dateB.getTime();
      });

      setEvents(eventsWithApplications);
    } catch (err: any) {
      setError(err.message || '申込済の取得に失敗しました');
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, error, refetch: fetchApplications };
}


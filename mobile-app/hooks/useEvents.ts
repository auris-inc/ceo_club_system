import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Event, EventApplication } from '../types';
import { useAuthStore } from '../stores/authStore';

export interface EventFilters {
  year?: number;
  month?: number;
  includePast?: boolean;
  applicationStatus?: 'applied' | 'not_applied' | 'all';
  keyword?: string;
  tagIds?: string[];
  showAll?: boolean; // ALLチェックがONの場合
}

export interface EventWithApplication extends Event {
  hasApplied?: boolean;
}

export function useEvents(filters?: EventFilters) {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<EventWithApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [filters, user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('events')
        .select(`
          *,
          event_event_tags(
            tag_id,
            event_tags(id, name, sort_order, is_active)
          )
        `)
        .eq('status_id', '00000000-0000-0000-0000-000000000202') // published
        .or('publish_at.is.null,publish_at.lte.' + new Date().toISOString());

      // 初期表示は未来のイベントのみ（フィルターで過去表示がONでない限り）
      if (!filters?.includePast) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('event_date', today.toISOString().split('T')[0]);
      }

      // 年月フィルター
      if (filters?.year && filters?.month) {
        const startDate = new Date(filters.year, filters.month - 1, 1);
        const endDate = new Date(filters.year, filters.month, 0);
        query = query
          .gte('event_date', startDate.toISOString().split('T')[0])
          .lte('event_date', endDate.toISOString().split('T')[0]);
      } else if (filters?.year) {
        const startDate = new Date(filters.year, 0, 1);
        const endDate = new Date(filters.year, 11, 31);
        query = query
          .gte('event_date', startDate.toISOString().split('T')[0])
          .lte('event_date', endDate.toISOString().split('T')[0]);
      }

      // キーワード検索
      if (filters?.keyword) {
        query = query.or(
          `title.ilike.%${filters.keyword}%,venue.ilike.%${filters.keyword}%`
        );
      }

      query = query
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      let eventsWithApplications = ((data as any[]) || []).map((event) => {
        const tags = event.event_event_tags
          ?.map((relation: any) => relation.event_tags)
          .filter((tag: any) => tag && tag.is_active) || [];
        return {
          ...event,
          tags,
        };
      }) as EventWithApplication[];

      // 申込みステータスを取得（hasApplied は「参加」表明済みを意味する）
      if (user) {
        const { data: applications, error: appError } = await supabase
          .from('event_applications')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('status', 'attending');

        if (!appError && applications) {
          const appliedEventIds = new Set(
            applications.map((app) => app.event_id)
          );
          eventsWithApplications = eventsWithApplications.map((event) => ({
            ...event,
            hasApplied: appliedEventIds.has(event.id),
          }));
        }
      }

      // 申込みステータスフィルター
      if (filters?.applicationStatus && filters.applicationStatus !== 'all') {
        if (filters.applicationStatus === 'applied') {
          eventsWithApplications = eventsWithApplications.filter(
            (e) => e.hasApplied === true
          );
        } else if (filters.applicationStatus === 'not_applied') {
          eventsWithApplications = eventsWithApplications.filter(
            (e) => e.hasApplied !== true
          );
        }
      }

      // タグフィルター
      if (filters?.tagIds && filters.tagIds.length > 0 && !filters.showAll) {
        eventsWithApplications = eventsWithApplications.filter((event) => {
          const eventTagIds = event.tags?.map((tag) => tag.id) || [];
          // 選択されたタグのいずれかがイベントに含まれているか
          return filters.tagIds!.some((tagId) => eventTagIds.includes(tagId));
        });
      }

      setEvents(eventsWithApplications);
    } catch (err: any) {
      setError(err.message || 'イベントの取得に失敗しました');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, error, refetch: fetchEvents };
}

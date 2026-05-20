import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Event, EventApplication, ApplicationStatus } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import RenderHTML from 'react-native-render-html';

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  attending: '参加',
  not_attending: '不参加',
  undecided: '調整中',
};

const STATUS_ORDER: ApplicationStatus[] = ['attending', 'undecided', 'not_attending'];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [application, setApplication] = useState<EventApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState<ApplicationStatus | null>(null);

  useEffect(() => {
    fetchEventDetail();
    if (user) {
      fetchApplication();
    }
  }, [id, user]);

  const fetchEventDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setEvent(data as Event);
    } catch (err: any) {
      setError(err.message || 'イベントの取得に失敗しました');
      console.error('Error fetching event detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplication = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('event_applications')
        .select('*')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setApplication((data as EventApplication) || null);
    } catch (err: any) {
      console.error('Error fetching application:', err);
    }
  };

  const handleSelectStatus = async (nextStatus: ApplicationStatus) => {
    if (!user || !event) return;
    if (application?.status === nextStatus) return;

    try {
      setSubmittingStatus(nextStatus);

      const { data, error: upsertError } = await supabase
        .from('event_applications')
        .upsert(
          {
            event_id: event.id,
            user_id: user.id,
            status: nextStatus,
            applied_at: new Date().toISOString(),
            cancelled_at: null,
          },
          { onConflict: 'event_id,user_id' },
        )
        .select()
        .single();

      if (upsertError) throw upsertError;

      setApplication(data as EventApplication);
    } catch (err: any) {
      console.error('Error updating application status:', err);
      Alert.alert('エラー', err.message || '更新に失敗しました');
    } finally {
      setSubmittingStatus(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const { width } = useWindowDimensions();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#243266" />
        </View>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || 'イベントが見つかりません'}
          </Text>
        </View>
      </View>
    );
  }

  const currentStatus: ApplicationStatus | null =
    (application?.status as ApplicationStatus) ?? null;

  return (
    <ScrollView style={styles.container}>
      {event.thumbnail_url && (
        <Image source={{ uri: event.thumbnail_url }} style={styles.thumbnail} />
      )}
      <View style={styles.content}>
        <Text style={styles.date}>
          {formatDate(event.event_date)}
          {event.start_time && ` ${formatTime(event.start_time)}`}
          {event.end_time && ` - ${formatTime(event.end_time)}`}
        </Text>
        <Text style={styles.title}>{event.title}</Text>

        {event.venue && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📍 開催場所</Text>
            <Text style={styles.infoValue}>{event.venue}</Text>
          </View>
        )}

        {event.capacity && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>👥 定員</Text>
            <Text style={styles.infoValue}>{event.capacity}名</Text>
          </View>
        )}

        <View style={styles.bodyContainer}>
          <RenderHTML
            contentWidth={width - 40}
            source={{ html: event.body || '' }}
            baseStyle={styles.body}
            tagsStyles={{
              h1: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, marginTop: 16 },
              h2: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, marginTop: 14 },
              h3: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, marginTop: 12 },
              p: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
              ul: { marginBottom: 12, paddingLeft: 20 },
              ol: { marginBottom: 12, paddingLeft: 20 },
              li: { fontSize: 16, lineHeight: 24, marginBottom: 4 },
              strong: { fontWeight: 'bold' },
              em: { fontStyle: 'italic' },
              a: { color: '#243266', textDecorationLine: 'underline' },
            }}
          />
        </View>

        {user && (
          <View style={styles.actionContainer}>
            <Text style={styles.actionLabel}>参加可否</Text>
            <View style={styles.statusButtonRow}>
              {STATUS_ORDER.map((status) => {
                const selected = currentStatus === status;
                const isSubmitting = submittingStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      selected && styles[`statusButton_${status}_selected`],
                    ]}
                    onPress={() => handleSelectStatus(status)}
                    disabled={submittingStatus !== null}
                    activeOpacity={0.7}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={selected ? '#fff' : '#243266'} />
                    ) : (
                      <Text
                        style={[
                          styles.statusButtonText,
                          selected && styles.statusButtonTextSelected,
                        ]}
                      >
                        {STATUS_LABELS[status]}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {currentStatus && (
              <Text style={styles.currentStatusHint}>
                現在の回答: {STATUS_LABELS[currentStatus]}
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    lineHeight: 32,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  bodyContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  body: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  actionContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d0d0d0',
    backgroundColor: '#fff',
    minHeight: 50,
  },
  statusButton_attending_selected: {
    backgroundColor: '#243266',
    borderColor: '#243266',
  },
  statusButton_undecided_selected: {
    backgroundColor: '#a8895b',
    borderColor: '#a8895b',
  },
  statusButton_not_attending_selected: {
    backgroundColor: '#7a7a7a',
    borderColor: '#7a7a7a',
  },
  statusButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  statusButtonTextSelected: {
    color: '#fff',
  },
  currentStatusHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});

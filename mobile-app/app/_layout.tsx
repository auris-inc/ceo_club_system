import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../stores/authStore';

// 通知の data.eventId を見て遷移先を決める
function notificationToRoute(
  data: Record<string, unknown> | undefined,
): string | null {
  if (!data) return null;
  const eventId = typeof data.eventId === 'string' ? data.eventId : null;
  if (eventId) return `/(tabs)/events/${eventId}`;
  return null;
}

export default function RootLayout() {
  const { user, loading, initialized, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  // ログイン前に通知がタップされた場合、ログイン完了後に飛ばすため保持
  const pendingRouteRef = useRef<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  // 通知タップで遷移
  useEffect(() => {
    // コールドスタート: 通知から起動された場合
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const route = notificationToRoute(
        response?.notification?.request?.content?.data as
          | Record<string, unknown>
          | undefined,
      );
      if (route) pendingRouteRef.current = route;
    });

    // フォアグラウンド/バックグラウンドでタップされた場合
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const route = notificationToRoute(
          response.notification.request.content.data as
            | Record<string, unknown>
            | undefined,
        );
        if (!route) return;
        if (user) {
          router.push(route);
        } else {
          pendingRouteRef.current = route;
        }
      },
    );

    return () => subscription.remove();
  }, [user]);

  useEffect(() => {
    if (!initialized || loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/news');
    } else if (user && pendingRouteRef.current && inTabsGroup) {
      // ログイン済み + タブ画面表示中なら、保留中の遷移を実行
      const route = pendingRouteRef.current;
      pendingRouteRef.current = null;
      router.push(route);
    }
  }, [user, initialized, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

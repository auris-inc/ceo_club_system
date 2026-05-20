import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// フォアグラウンドで通知を受信した時の表示挙動
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }) as Notifications.NotificationBehavior,
});

/**
 * ログイン成功時に呼び出して、Expo Push Token を取得し
 * users.expo_push_token に保存する。
 * 拒否されても無視する（致命エラーにしない）。
 */
export async function registerPushTokenForUser(userId: string): Promise<void> {
  try {
    // 実機のみ取得可能（Expo Go や シミュレータでは取得不可）
    if (!Device.isDevice) {
      console.log('[push] Skipping token registration: not a physical device');
      return;
    }

    // Android はチャンネル設定が必要
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#243266',
      });
    }

    // 権限確認・要求
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[push] Permission not granted, skipping token registration');
      return;
    }

    // Expo Push Token を取得（projectId は app.json の eas.projectId から）
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) {
      console.warn('[push] EAS projectId is not configured; cannot get push token');
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    if (!token) return;

    // DB に保存（同じ token でも upsert で問題なし）
    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.warn('[push] Failed to save token to DB:', error.message);
    } else {
      console.log('[push] Token registered:', token.slice(0, 20) + '...');
    }
  } catch (e) {
    // ネイティブモジュールが無い環境 (Web/Expo Go の一部) のクラッシュを防ぐ
    console.warn('[push] registerPushTokenForUser failed:', e);
  }
}

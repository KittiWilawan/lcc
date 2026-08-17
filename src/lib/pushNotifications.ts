import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const STORAGE_KEY_EXPO_PUSH_TOKEN = '@expo_push_token';

function getNotificationsModule() {
  try {
    const Notifications = require('expo-notifications');
    return Notifications;
  } catch (e) {
    console.log('expo-notifications module not loaded:', e);
    return null;
  }
}

/**
 * Configure OS High-Priority Emergency Notification Channel (Android & iOS)
 * and register/sync Expo Push Token to Supabase
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return false;

    if (typeof Notifications.setNotificationHandler === 'function') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }

    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('emergency-fall-channel', {
        name: 'การแจ้งเตือนเหตุล้มฉุกเฉิน (LookLanCare)',
        importance: Notifications.AndroidImportance?.MAX ?? 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        sound: 'default',
      });
    }

    if (typeof Notifications.getPermissionsAsync !== 'function') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Get and save Expo Push Token
    try {
      if (typeof Notifications.getExpoPushTokenAsync === 'function') {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        if (token) {
          await AsyncStorage.setItem(STORAGE_KEY_EXPO_PUSH_TOKEN, token);
          await syncPushTokenToSupabase(token);
        }
      }
    } catch (err) {
      console.log('Push token retrieval notice:', err);
    }

    return true;
  } catch (e) {
    console.log('Error registering OS push notifications:', e);
    return false;
  }
}

/**
 * Sync push token to Supabase profiles table
 */
export async function syncPushTokenToSupabase(token: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', session.user.id);
    }
  } catch (e) {
    console.log('Error syncing token to Supabase:', e);
  }
}

/**
 * Dispatch Remote Expo Push Notification to all family members
 */
export async function sendRemotePushNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; count: number }> {
  try {
    const familyId = await AsyncStorage.getItem('familyId');
    let targetTokens: string[] = [];

    // Query Expo Push Tokens for family members from Supabase
    if (familyId) {
      const { data: members } = await supabase
        .from('family_members')
        .select('user_id')
        .eq('family_id', familyId);

      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('expo_push_token')
            .in('id', userIds)
            .not('expo_push_token', 'is', null);

          if (profiles) {
            targetTokens = profiles.map((p) => p.expo_push_token).filter(Boolean);
          }
        }
      }
    }

    // Fallback: use local saved token if no remote tokens retrieved
    if (targetTokens.length === 0) {
      const localToken = await AsyncStorage.getItem(STORAGE_KEY_EXPO_PUSH_TOKEN);
      if (localToken) targetTokens.push(localToken);
    }

    if (targetTokens.length === 0) {
      return { success: false, count: 0 };
    }

    // Construct Expo Push Payloads
    const messages = targetTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: params.title,
      body: params.body,
      data: params.data || { type: 'fall_alert', timestamp: new Date().toISOString() },
      priority: 'high',
      channelId: 'emergency-fall-channel',
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const resData = await response.json();
    return { success: response.ok, count: targetTokens.length };
  } catch (e) {
    console.log('Error dispatching remote Expo push notification:', e);
    return { success: false, count: 0 };
  }
}

/**
 * Trigger high-priority local & remote OS Lock Screen notification for Fall Events
 */
export async function sendLocalFallNotification(params: {
  personName?: string;
  cameraName?: string;
  groundDuration?: number;
}): Promise<void> {
  const person = params.personName || 'สมาชิกผู้สูงอายุ';
  const location = params.cameraName || 'กล้องวงจรปิด';
  const duration = params.groundDuration || 1.5;

  const title = '🚨 [LLC Alert] ตรวจพบการล้มวิกฤต!';
  const body = `ตรวจพบ ${person} ล้มที่ ${location} (นอนติดพื้น ${duration} วินาที) กดแตะเพื่อเข้าดูภาพด่วน!`;

  // Local notification
  try {
    const Notifications = getNotificationsModule();
    if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
          data: { type: 'fall_alert', timestamp: new Date().toISOString() },
        },
        trigger: null,
      });
    }
  } catch (e) {
    console.log('Error sending local fall notification:', e);
  }

  // Remote Push notification broadcast to family members
  void sendRemotePushNotification({ title, body });
}

/**
 * Trigger high-priority local & remote OS Lock Screen notification for Emergency SOS
 */
export async function sendLocalSOSNotification(): Promise<void> {
  const title = '🚨 [LLC SOS] สัญญาณขอความช่วยเหลือฉุกเฉิน!';
  const body = 'มีผู้กดปุ่มขอความช่วยเหลือ SOS 1669 บนหน้าจอแอป กดเพื่อเปิดระบบสายด่วนกู้ชีพด่วน!';

  try {
    const Notifications = getNotificationsModule();
    if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
          data: { type: 'sos_alert', timestamp: new Date().toISOString() },
        },
        trigger: null,
      });
    }
  } catch (e) {
    console.log('Error sending local SOS notification:', e);
  }

  // Remote Push notification broadcast to family members
  void sendRemotePushNotification({ title, body });
}

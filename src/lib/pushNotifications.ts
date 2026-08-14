import { Platform } from 'react-native';

function getNotificationsModule() {
  try {
    const Notifications = require('expo-notifications');
    return Notifications;
  } catch (e) {
    console.log('expo-notifications is not supported in Expo Go environment:', e);
    return null;
  }
}

/**
 * Configure OS High-Priority Emergency Notification Channel (Android & iOS)
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

    return finalStatus === 'granted';
  } catch (e) {
    console.log('Error registering OS push notifications:', e);
    return false;
  }
}

/**
 * Trigger high-priority local OS Lock Screen notification for Fall Events
 */
export async function sendLocalFallNotification(params: {
  personName?: string;
  cameraName?: string;
  groundDuration?: number;
}): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') return;

    const person = params.personName || 'คุณยายสมศรี';
    const location = params.cameraName || 'กล้องวงจรปิด';
    const duration = params.groundDuration || 1.5;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 [LLC Alert] ตรวจพบการล้มวิกฤต!',
        body: `ตรวจพบ ${person} ล้มที่ ${location} (นอนติดพื้น ${duration} วินาที) กดแตะเพื่อเข้าดูภาพด่วน!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
        data: { type: 'fall_alert', timestamp: new Date().toISOString() },
      },
      trigger: null, // Instant trigger
    });
  } catch (e) {
    console.log('Error sending local fall notification:', e);
  }
}

/**
 * Trigger high-priority local OS Lock Screen notification for Emergency SOS
 */
export async function sendLocalSOSNotification(): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 [LLC SOS] สัญญาณขอความช่วยเหลือฉุกเฉิน!',
        body: 'มีผู้กดปุ่มขอความช่วยเหลือ SOS 1669 บนหน้าจอแอป กดเพื่อเปิดระบบสายด่วนกู้ชีพด่วน!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
        data: { type: 'sos_alert', timestamp: new Date().toISOString() },
      },
      trigger: null, // Instant trigger
    });
  } catch (e) {
    console.log('Error sending local SOS notification:', e);
  }
}

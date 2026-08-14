import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY_LINE_TOKEN = '@line_notify_token';

/**
 * Save LINE Notify Token to local storage
 */
export async function saveLineToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LINE_TOKEN, token.trim());
  } catch (e) {
    console.error('Error saving LINE token:', e);
  }
}

/**
 * Retrieve saved LINE Notify Token
 */
export async function getLineToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_LINE_TOKEN);
  } catch (e) {
    console.error('Error getting LINE token:', e);
    return null;
  }
}

/**
 * Send message and optional photo snapshot via LINE Notify API (100% Free)
 */
export async function sendLineNotification(
  message: string,
  imageUrl?: string,
  tokenOverride?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const token = tokenOverride || (await getLineToken());

    if (!token) {
      return {
        success: false,
        message: 'ยังไม่ได้ตั้งค่า LINE Notify Token (สามารถตั้งค่าได้ที่หน้าโปรไฟล์)',
      };
    }

    const formData = new URLSearchParams();
    formData.append('message', message);

    if (imageUrl) {
      formData.append('imageFullsize', imageUrl);
      formData.append('imageThumbnail', imageUrl);
    }

    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (response.ok && data.status === 200) {
      return { success: true, message: 'ส่งการแจ้งเตือนเข้า LINE เรียบร้อยแล้ว' };
    } else {
      return {
        success: false,
        message: data.message || `ส่ง LINE ไม่สำเร็จ (HTTP ${response.status})`,
      };
    }
  } catch (e: any) {
    console.error('LINE Notify Error:', e);
    return { success: false, message: e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE' };
  }
}

/**
 * Format and send a high-priority Fall Alert message to LINE
 */
export async function sendFallEventLineAlert(params: {
  personName?: string;
  cameraName?: string;
  groundDuration?: number;
  torsoAngle?: number;
  imageUrl?: string;
  tokenOverride?: string;
}): Promise<{ success: boolean; message: string }> {
  const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  const formattedMessage = `
🚨 [LLC Emergency Alert] ตรวจพบการล้ม!

👤 ผู้สูงอายุ: ${params.personName || 'สมาชิกผู้สูงอายุ'}
📍 ตำแหน่ง: ${params.cameraName || 'กล้องวงจรปิด'}
⏰ เวลา: ${timeStr} น. (${dateStr})
📐 มุมลำตัว: ${params.torsoAngle || 18}°
⏱️ นอนติดพื้น: ${params.groundDuration || 1.2} วินาที

📞 ติดต่อฉุกเฉิน 1669 หรือตรวจสอบในแอป LookLanCare ด่วน!
  `.trim();

  const defaultSnapshot =
    params.imageUrl ||
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=800&auto=format&fit=crop';

  return sendLineNotification(formattedMessage, defaultSnapshot, params.tokenOverride);
}

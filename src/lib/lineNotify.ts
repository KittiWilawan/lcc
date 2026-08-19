import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY_LINE_TOKEN = '@line_messaging_channel_token';
export const STORAGE_KEY_LINE_TARGET_ID = '@line_messaging_target_id';

/**
 * Save LINE Messaging API Channel Access Token & Target ID to local storage
 */
export async function saveLineToken(token: string, targetId?: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LINE_TOKEN, token.trim());
    if (targetId !== undefined) {
      await AsyncStorage.setItem(STORAGE_KEY_LINE_TARGET_ID, targetId.trim());
    }
  } catch (e) {
    console.error('Error saving LINE Messaging API config:', e);
  }
}

/**
 * Retrieve saved LINE Messaging API Tokens
 */
export async function getLineToken(): Promise<{ token: string | null; targetId: string | null }> {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEY_LINE_TOKEN);
    const targetId = await AsyncStorage.getItem(STORAGE_KEY_LINE_TARGET_ID);
    return { token, targetId };
  } catch (e) {
    console.error('Error getting LINE token:', e);
    return { token: null, targetId: null };
  }
}

/**
 * Send message and photo snapshot via LINE Messaging API 2026 (LINE Official Account Push / Broadcast)
 */
export async function sendLineNotification(
  message: string,
  imageUrl?: string,
  tokenOverride?: string,
  targetIdOverride?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const saved = await getLineToken();
    const token = (tokenOverride || saved.token || '').trim();
    const targetId = (targetIdOverride !== undefined ? targetIdOverride : saved.targetId || '').trim();

    if (!token) {
      return {
        success: false,
        message: 'ยังไม่ได้ตั้งค่า LINE Messaging API Token (สามารถตั้งค่าได้ที่หน้าโปรไฟล์)',
      };
    }

    // Determine endpoint: Push to specific User/Group ID, or Broadcast to all followers
    const isBroadcast = !targetId || targetId.toLowerCase() === 'broadcast';
    const endpoint = isBroadcast
      ? 'https://api.line.me/v2/bot/message/broadcast'
      : 'https://api.line.me/v2/bot/message/push';

    const messagesPayload: any[] = [
      {
        type: 'text',
        text: message,
      },
    ];

    if (imageUrl) {
      messagesPayload.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      });
    }

    const requestBody: any = {
      messages: messagesPayload,
    };

    if (!isBroadcast) {
      requestBody.to = targetId;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return { success: true, message: 'ส่งการแจ้งเตือนผ่าน LINE Messaging API เรียบร้อยแล้ว' };
    } else {
      // Fallback: Try Legacy Notify API if token format matches legacy
      if (response.status === 401 && token.length < 50) {
        return sendLegacyLineNotify(message, imageUrl, token);
      }
      return {
        success: false,
        message: data.message || `ส่ง LINE ไม่สำเร็จ (HTTP ${response.status})`,
      };
    }
  } catch (e: any) {
    console.error('LINE Messaging API Error:', e);
    return { success: false, message: e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ LINE Messaging API' };
  }
}

/**
 * Legacy LINE Notify Fallback Handler
 */
async function sendLegacyLineNotify(
  message: string,
  imageUrl?: string,
  token?: string
): Promise<{ success: boolean; message: string }> {
  try {
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

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.status === 200) {
      return { success: true, message: 'ส่งการแจ้งเตือนเข้า LINE เรียบร้อยแล้ว' };
    }
    return { success: false, message: data.message || 'ส่ง LINE Notify ไม่สำเร็จ' };
  } catch (e: any) {
    return { success: false, message: e.message || 'เกิดข้อผิดพลาด' };
  }
}

/**
 * Format and send a high-priority Fall Alert message via 2026 LINE Messaging API
 */
export async function sendFallEventLineAlert(params: {
  personName?: string;
  cameraName?: string;
  groundDuration?: number;
  torsoAngle?: number;
  imageUrl?: string;
  tokenOverride?: string;
  targetIdOverride?: string;
}): Promise<{ success: boolean; message: string }> {
  const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  const formattedMessage = `🚨 [LLC Emergency Alert] ตรวจพบการล้มวิกฤต!

👤 ผู้สูงอายุ: ${params.personName || 'สมาชิกผู้สูงอายุ'}
📍 ตำแหน่ง: ${params.cameraName || 'กล้องวงจรปิด'}
⏰ เวลา: ${timeStr} น. (${dateStr})
📐 มุมลำตัว: ${params.torsoAngle || 18}°
⏱️ นอนติดพื้น: ${params.groundDuration || 1.2} วินาที

📞 ติดต่อฉุกเฉิน 1669 หรือเปิดแอป LookLanCare ด่วน!`.trim();

  const defaultSnapshot =
    params.imageUrl ||
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=800&auto=format&fit=crop';

  return sendLineNotification(formattedMessage, defaultSnapshot, params.tokenOverride, params.targetIdOverride);
}


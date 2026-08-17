import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface FallEvidenceRecord {
  id: string;
  family_id?: string;
  member_name: string;
  camera_name: string;
  image_url?: string;
  details?: string;
  ground_duration?: number;
  torso_angle?: number;
  event_type: 'actual' | 'simulated' | 'sos';
  status: 'notified' | 'responded' | 'cancelled';
  created_at: string;
}

export const STORAGE_KEY_FALL_EVIDENCE = '@fall_evidence_records';

/**
 * Upload Fall Evidence Photo to Supabase Storage Bucket ('fall-evidence')
 */
export async function uploadFallEvidenceImage(
  imageUriOrBase64: string,
  fileName?: string
): Promise<string | null> {
  try {
    if (!imageUriOrBase64) return null;

    // If it's already a web HTTP URL, return as is
    if (imageUriOrBase64.startsWith('http://') || imageUriOrBase64.startsWith('https://')) {
      return imageUriOrBase64;
    }

    const name = fileName || `fall_${Date.now()}.jpg`;

    // Fetch blob or base64 buffer for upload
    const response = await fetch(imageUriOrBase64);
    const blob = await response.blob();

    const { data, error } = await supabase.storage
      .from('fall-evidence')
      .upload(name, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.log('Error uploading evidence to Supabase Storage:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('fall-evidence')
      .getPublicUrl(name);

    return publicUrlData?.publicUrl || null;
  } catch (e) {
    console.log('Fallback handling evidence image upload:', e);
    return null;
  }
}

/**
 * Create and Save a new Fall Evidence Event (Cloud DB + Local Storage)
 */
export async function recordFallEvent(params: {
  memberName?: string;
  cameraName?: string;
  imageUri?: string;
  details?: string;
  groundDuration?: number;
  torsoAngle?: number;
  eventType?: 'actual' | 'simulated' | 'sos';
}): Promise<FallEvidenceRecord> {
  const familyId = (await AsyncStorage.getItem('familyId')) || undefined;
  const memberName = params.memberName || 'สมาชิกผู้สูงอายุ';
  const cameraName = params.cameraName || 'กล้องวงจรปิด';
  const eventType = params.eventType || 'actual';
  const createdAt = new Date().toISOString();

  let uploadedUrl = params.imageUri;
  if (params.imageUri) {
    const cloudUrl = await uploadFallEvidenceImage(params.imageUri);
    if (cloudUrl) uploadedUrl = cloudUrl;
  }

  // Default snapshot photo preset if no direct camera capture is passed
  const defaultSnapshot =
    uploadedUrl ||
    'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=800&auto=format&fit=crop';

  const newRecord: FallEvidenceRecord = {
    id: Date.now().toString(),
    family_id: familyId,
    member_name: memberName,
    camera_name: cameraName,
    image_url: defaultSnapshot,
    details: params.details || `ตรวจพบการหกล้มที่ ${cameraName}`,
    ground_duration: params.groundDuration || 1.5,
    torso_angle: params.torsoAngle || 18,
    event_type: eventType,
    status: eventType === 'actual' ? 'responded' : 'notified',
    created_at: createdAt,
  };

  // Save to Supabase Cloud Database table 'fall_events'
  try {
    if (familyId) {
      await supabase.from('fall_events').insert({
        family_id: familyId,
        member_name: memberName,
        camera_name: cameraName,
        image_url: defaultSnapshot,
        details: newRecord.details,
        ground_duration: newRecord.ground_duration,
        torso_angle: newRecord.torso_angle,
        event_type: eventType,
        status: newRecord.status,
      });
    }
  } catch (e) {
    console.log('Error writing fall event to Supabase:', e);
  }

  // Save to Local Storage fallback
  try {
    const localData = await AsyncStorage.getItem(STORAGE_KEY_FALL_EVIDENCE);
    const list: FallEvidenceRecord[] = localData ? JSON.parse(localData) : [];
    list.unshift(newRecord);
    await AsyncStorage.setItem(STORAGE_KEY_FALL_EVIDENCE, JSON.stringify(list.slice(0, 30)));
  } catch (e) {
    console.log('Error saving local fall evidence:', e);
  }

  return newRecord;
}

/**
 * Load Fall Event Records from Supabase & Local Storage
 */
export async function getFallEvents(): Promise<FallEvidenceRecord[]> {
  try {
    const familyId = await AsyncStorage.getItem('familyId');
    if (familyId) {
      const { data, error } = await supabase
        .from('fall_events')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        return data as FallEvidenceRecord[];
      }
    }
  } catch (e) {
    console.log('Error reading fall events from cloud:', e);
  }

  // Fallback to local storage
  try {
    const localData = await AsyncStorage.getItem(STORAGE_KEY_FALL_EVIDENCE);
    return localData ? JSON.parse(localData) : [];
  } catch (e) {
    console.log('Error reading local fall evidence:', e);
    return [];
  }
}

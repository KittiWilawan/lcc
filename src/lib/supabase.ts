import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

const customStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? customStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Checks if the user is already a member of any family in Supabase.
 * If found, automatically saves familyId and familyCode into AsyncStorage
 * and returns the family details.
 */
export async function checkAndSaveUserFamily(userId: string): Promise<{ familyId: string; familyCode: string } | null> {
  try {
    const { data: member, error } = await supabase
      .from('family_members')
      .select('family_id, families(code)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && member?.family_id) {
      const familyId = member.family_id;
      const familyCode = (member.families as any)?.code || '';
      await AsyncStorage.setItem('familyId', familyId);
      if (familyCode) {
        await AsyncStorage.setItem('familyCode', familyCode);
      }
      return { familyId, familyCode };
    }
  } catch (e) {
    console.log('Error checking user family:', e);
  }
  return null;
}


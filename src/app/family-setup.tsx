import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function FamilySetupScreen() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'create' | 'join'>('join');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // เลื่อนไปช่องถัดไปอัตโนมัติถ้าพิมพ์เสร็จ
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // ถอยกลับไปช่องก่อนหน้าถ้ากดลบแล้วช่องปัจจุบันว่าง
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำรายการ');
        return;
      }

      if (selectedMode === 'join') {
        const fullCode = code.join('');
        if (fullCode.length < 6) {
          Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกรหัสให้ครบ 6 หลัก');
          return;
        }

        // 1. ค้นหาครอบครัวด้วย Code
        const { data: family, error: findError } = await supabase
          .from('families')
          .select('*')
          .eq('code', fullCode)
          .single();

        if (findError || !family) {
          Alert.alert('ไม่พบครอบครัว', 'รหัสที่ระบุไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
          return;
        }

        // 2. Insert ตัวเองเข้าครอบครัว
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        const meta = session.user.user_metadata;
        const displayName = profile?.full_name || meta?.full_name || 'สมาชิกใหม่';
        const avatarUrl = profile?.avatar_url || null;

        const { error: joinError } = await supabase
          .from('family_members')
          .insert([{
            family_id: family.id,
            user_id: userId,
            display_name: displayName,
            role: 'สมาชิก (Member)',
            avatar_url: avatarUrl
          }]);

        if (joinError) throw joinError;

        await AsyncStorage.setItem('familyCode', fullCode);
        await AsyncStorage.setItem('familyId', family.id);
        Alert.alert('สำเร็จ', 'เข้าร่วมครอบครัวเรียบร้อยแล้ว');
        router.replace('/home');

      } else {
        if (!generatedCode) {
          const newCode = Math.floor(100000 + Math.random() * 900000).toString();

          // สร้างครอบครัวใหม่
          const { data: newFamily, error: createError } = await supabase
            .from('families')
            .insert([{
              name: 'ครอบครัวสุขสันต์',
              code: newCode,
              created_by: userId
            }])
            .select()
            .single();

          if (createError) throw createError;

          // เพิ่มตัวเองเป็นเจ้าของ
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
          const meta = session.user.user_metadata;
          const displayName = profile?.full_name || meta?.full_name || 'ผู้สร้าง';
          const avatarUrl = profile?.avatar_url || null;

          await supabase
            .from('family_members')
            .insert([{
              family_id: newFamily.id,
              user_id: userId,
              display_name: displayName,
              role: 'ผู้ดูแลหลัก (Caregiver)',
              avatar_url: avatarUrl
            }]);

          setGeneratedCode(newCode);
          await AsyncStorage.setItem('familyCode', newCode);
          await AsyncStorage.setItem('familyId', newFamily.id);

        } else {
          router.replace('/home');
        }
      }
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>เชื่อมต่อครอบครัว</Text>
            <Text style={styles.subtitle}>ขั้นตอนสุดท้ายเพื่อการดูแลที่ไร้กังวล</Text>
          </View>

          {/* Option 1: Create Family */}
          <TouchableOpacity
            style={[styles.optionCard, selectedMode === 'create' && styles.optionCardActive, selectedMode === 'create' && styles.joinCardWrapper]}
            onPress={() => setSelectedMode('create')}
            activeOpacity={0.7}
          >
            <View style={styles.joinHeader}>
              <View style={[styles.iconBox, selectedMode === 'create' ? styles.iconBoxActive : styles.iconBoxInactive]}>
                <MaterialCommunityIcons
                  name="home-plus-outline"
                  size={28}
                  color={selectedMode === 'create' ? '#ffffff' : '#16a34a'}
                />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>สร้างครอบครัวใหม่</Text>
                <Text style={styles.optionSubtitle}>สำหรับผู้ที่ต้องการเริ่มต้นกลุ่มการดูแลใหม่</Text>
              </View>
              {selectedMode !== 'create' && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color="#cbd5e1"
                />
              )}
            </View>

            {selectedMode === 'create' && generatedCode && (
              <View style={styles.generatedCodeSection}>
                <Text style={styles.generatedCodeLabel}>รหัสครอบครัวของคุณ</Text>
                <View style={styles.generatedCodeContainer}>
                  <Text style={styles.generatedCodeText}>{generatedCode}</Text>
                </View>
                <Text style={styles.generatedCodeNote}>* แชร์รหัส 6 หลักนี้ให้สมาชิกคนอื่นเพื่อเข้าร่วม</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Option 2: Join Family */}
          <TouchableOpacity
            style={[styles.optionCard, selectedMode === 'join' && styles.optionCardActive, styles.joinCardWrapper]}
            onPress={() => setSelectedMode('join')}
            activeOpacity={0.7}
          >
            <View style={styles.joinHeader}>
              <View style={[styles.iconBox, selectedMode === 'join' ? styles.iconBoxJoinActive : styles.iconBoxInactive]}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={28}
                  color={selectedMode === 'join' ? '#0f172a' : '#16a34a'}
                />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>เข้าร่วมครอบครัว</Text>
                <Text style={styles.optionSubtitle}>กรอกรหัสจากสมาชิกในครอบครัวเพื่อเข้าร่วม</Text>
              </View>
            </View>

            {/* OTP Input Section (Shows only when 'join' is selected) */}
            {selectedMode === 'join' && (
              <View style={styles.otpSection}>
                <Text style={styles.otpLabel}>รหัสครอบครัว (6 หลัก)</Text>
                <View style={styles.otpContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      style={styles.otpInput}
                      value={digit}
                      onChangeText={(text) => handleCodeChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {selectedMode === 'join' ? 'ยืนยันรหัส' : generatedCode ? 'เข้าสู่หน้าหลัก' : 'สร้างครอบครัว'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>ย้อนกลับ</Text>
          </TouchableOpacity>

          {/* Footer Text */}
          <Text style={styles.footerText}>
            คุณสามารถตั้งค่าภายหลังได้ในหน้าโปรไฟล์
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#065f46', // สีเขียวเข้ม
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCardActive: {
    borderColor: '#16a34a',
    borderWidth: 1.5,
  },
  joinCardWrapper: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconBoxInactive: {
    backgroundColor: '#f0fdf4',
  },
  iconBoxActive: {
    backgroundColor: '#34d399',
  },
  iconBoxJoinActive: {
    backgroundColor: '#e2e8f0', // สีเทาอ่อนเหมือนในรูป
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  otpSection: {
    marginTop: 24,
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 12,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  generatedCodeSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  generatedCodeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 12,
  },
  generatedCodeContainer: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34d399',
    marginBottom: 8,
  },
  generatedCodeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#065f46',
    letterSpacing: 4,
  },
  generatedCodeNote: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: '#065f46',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#64748b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
  },
});

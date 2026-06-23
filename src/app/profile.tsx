import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

interface EmergencyContact {
  id: string;
  profile_id: string;
  name: string;
  phone: string;
  is_primary: boolean;
  icon_name: string;
}

export default function ProfileScreen() {
  const router = useRouter();

  // State 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarImage, setNewAvatarImage] = useState<string | null>(null);
  const [familyCode, setFamilyCode] = useState('ไม่มีรหัส');
  const [fallAlerts, setFallAlerts] = useState(true);
  const [activitySummary, setActivitySummary] = useState(true);
  const [emergencySms, setEmergencySms] = useState(false);

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPrimary, setContactPrimary] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อน');
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // โหลดรหัสครอบครัวจากที่ถูกสร้างหรือกรอกไว้
      const storedCode = await AsyncStorage.getItem('familyCode');
      if (storedCode) setFamilyCode(storedCode);

      // ดึงข้อมูลจากตาราง profiles
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      // ใช้ metadata จากการสมัครเป็นค่าเริ่มต้น (Fallback)
      const meta = session.user.user_metadata;

      setFullName(data?.full_name || meta?.full_name || '');
      setPhoneNumber(data?.phone || meta?.phone || '');
      setAvatarUrl(data?.avatar_url || meta?.avatar_url || null);
      setFallAlerts(data?.fall_alerts ?? true);
      setActivitySummary(data?.activity_summary ?? true);
      setEmergencySms(data?.emergency_sms ?? false);

      // ดึงข้อมูล Contacts
      const { data: contactsData } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('profile_id', session.user.id)
        .order('is_primary', { ascending: false });

      if (contactsData) {
        setContacts(contactsData);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // แก้ไขตรงนี้ให้ใช้ Enum ที่ถูกต้องของ Expo เพื่อแก้ Syntax Error
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewAvatarImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!userId) {
        Alert.alert('แจ้งเตือน', 'ไม่พบข้อมูลผู้ใช้');
        return;
      }

      let finalAvatarUrl = avatarUrl;

      // อัปโหลดรูปภาพใหม่ถ้ามีการเลือก
      if (newAvatarImage) {
        const fileName = `profile-${userId}-${Date.now()}.jpg`;
        const response = await fetch(newAvatarImage);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('อัปโหลดรูปล้มเหลว: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        finalAvatarUrl = publicUrl;
      }

      const updates = {
        id: userId,
        full_name: fullName,
        phone: phoneNumber,
        avatar_url: finalAvatarUrl,
        fall_alerts: fallAlerts,
        activity_summary: activitySummary,
        emergency_sms: emergencySms,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;

      Alert.alert('สำเร็จ', 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
      router.back();
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('เกิดข้อผิดพลาดในการบันทึก', error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openAddContactModal = () => {
    setEditingContactId(null);
    setContactName('');
    setContactPhone('');
    setContactPrimary(false);
    setShowContactModal(true);
  };

  const openEditContactModal = (contact: EmergencyContact) => {
    setEditingContactId(contact.id);
    setContactName(contact.name);
    setContactPhone(contact.phone);
    setContactPrimary(contact.is_primary);
    setShowContactModal(true);
  };

  const handleSaveContact = async () => {
    if (!userId) return;
    if (!contactName || !contactPhone) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อและเบอร์โทร');
      return;
    }

    setSaving(true);
    try {
      if (editingContactId) {
        const { error } = await supabase
          .from('emergency_contacts')
          .update({ name: contactName, phone: contactPhone, is_primary: contactPrimary })
          .eq('id', editingContactId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('emergency_contacts')
          .insert([{ profile_id: userId, name: contactName, phone: contactPhone, is_primary: contactPrimary, icon_name: 'account-outline' }]);
        if (error) throw error;
      }

      setShowContactModal(false);
      loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อนี้?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive', onPress: async () => {
          setSaving(true);
          try {
            const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
            if (error) throw error;
            loadProfile();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  };

  // ดึงค่า URI ของรูปโปรไฟล์ออกมารอไว้ข้างนอก เพื่อให้โค้ดส่วน JSX สะอาดและปลอดภัยขึ้น
  const displayAvatarUri = newAvatarImage || avatarUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoPlaceholder}>
            <MaterialCommunityIcons name="shield-account" size={20} color="#059669" />
          </View>
          <Text style={styles.headerTitle}>LOOKLANCARE</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
          <MaterialCommunityIcons name="account-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={{ marginTop: 12, color: '#64748b' }}>กำลังโหลดข้อมูล...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile Picture Section */}
          <View style={styles.profileHeader}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              <View style={styles.avatarCircle}>
                {displayAvatarUri ? (
                  <Image source={{ uri: displayAvatarUri }} style={{ width: 76, height: 76, borderRadius: 38 }} />
                ) : (
                  <MaterialCommunityIcons name="account-plus-outline" size={40} color="#94a3b8" />
                )}
              </View>
              <View style={styles.cameraBadge}>
                <MaterialCommunityIcons name="camera" size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileTitle}>แก้ไขโปรไฟล์</Text>
            <Text style={styles.profileSubtitle}>จัดการข้อมูลส่วนตัวของคุณ</Text>
          </View>

          {/* Form Inputs */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ชื่อ-นามสกุล (Full Name)</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>เบอร์โทรศัพท์ (Phone Number)</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Family Connection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account-group" size={20} color="#059669" />
              <Text style={styles.sectionTitle}>เชื่อมต่อครอบครัว</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#34d399' }]}>
                  <MaterialCommunityIcons name="key-variant" size={20} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.cardLabel}>รหัสครอบครัว</Text>
                  <Text style={styles.cardCode}>{familyCode}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.copyBtn}>
                <MaterialCommunityIcons name="content-copy" size={20} color="#059669" />
                <Text style={styles.copyText}>คัดลอก</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#e2e8f0' }]}>
                  <MaterialCommunityIcons name="link-variant" size={20} color="#64748b" />
                </View>
                <View>
                  <Text style={styles.cardLabel}>ลิงก์เชิญเข้าครอบครัว</Text>
                  <Text style={styles.cardSubtitle}>ส่งลิงก์เพื่อเชิญสมาชิกเข้าบ้าน</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.shareBtn}>
                <MaterialCommunityIcons name="share-variant" size={16} color="#ffffff" />
                <Text style={styles.shareText}>แชร์ลิงก์</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="bell-outline" size={20} color="#059669" />
              <Text style={styles.sectionTitle}>ตั้งค่าการแจ้งเตือน</Text>
            </View>

            <View style={styles.settingCard}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                  <MaterialCommunityIcons name="run-fast" size={20} color="#dc2626" />
                </View>
                <View>
                  <Text style={styles.cardLabel}>แจ้งเตือนเมื่อตรวจพบการล้ม</Text>
                  <Text style={styles.cardSubtitle}>Fall Detection Alerts</Text>
                </View>
              </View>
              <Switch
                value={fallAlerts}
                onValueChange={setFallAlerts}
                trackColor={{ false: '#cbd5e1', true: '#059669' }}
                thumbColor={'#ffffff'}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
                  <MaterialCommunityIcons name="file-document-outline" size={20} color="#059669" />
                </View>
                <View>
                  <Text style={styles.cardLabel}>สรุปกิจกรรมรายวัน</Text>
                  <Text style={styles.cardSubtitle}>Activity Summaries</Text>
                </View>
              </View>
              <Switch
                value={activitySummary}
                onValueChange={setActivitySummary}
                trackColor={{ false: '#cbd5e1', true: '#059669' }}
                thumbColor={'#ffffff'}
              />
            </View>

            <View style={styles.settingCard}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#f1f5f9' }]}>
                  <MaterialCommunityIcons name="message-text-outline" size={20} color="#64748b" />
                </View>
                <View>
                  <Text style={styles.cardLabel}>ส่ง SMS ฉุกเฉิน</Text>
                  <Text style={styles.cardSubtitle}>Emergency SMS</Text>
                </View>
              </View>
              <Switch
                value={emergencySms}
                onValueChange={setEmergencySms}
                trackColor={{ false: '#cbd5e1', true: '#059669' }}
                thumbColor={'#ffffff'}
              />
            </View>
          </View>

          {/* Emergency Contacts */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color="#dc2626" />
              <Text style={styles.sectionTitle}>รายชื่อติดต่อฉุกเฉิน</Text>
            </View>

            {contacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={contact.is_primary ? styles.contactCardPrimary : styles.contactCard}
                onPress={() => handleCall(contact.phone)}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
                    <MaterialCommunityIcons name={(contact?.icon_name || 'account-outline') as any} size={20} color="#0284c7" />
                  </View>
                  <View>
                    <Text style={styles.cardLabel}>{contact.name}</Text>
                    <Text style={styles.cardSubtitle}>{contact.phone}</Text>
                  </View>
                </View>
                <View style={styles.contactRight}>
                  {contact.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => {
                    Alert.alert('จัดการรายชื่อ', contact.name, [
                      { text: 'โทรออก', onPress: () => handleCall(contact.phone) },
                      { text: 'แก้ไข', onPress: () => openEditContactModal(contact) },
                      { text: 'ลบ', style: 'destructive', onPress: () => handleDeleteContact(contact.id) },
                      { text: 'ยกเลิก', style: 'cancel' }
                    ]);
                  }} style={{ padding: 8 }}>
                    <MaterialCommunityIcons name="dots-vertical" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {contacts.length === 0 && (
              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>ยังไม่มีรายชื่อผู้ติดต่อฉุกเฉิน</Text>
              </View>
            )}

            <TouchableOpacity style={styles.addContactBtn} onPress={openAddContactModal}>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#059669" style={{ marginRight: 8 }} />
              <Text style={styles.addContactText}>เพิ่มรายชื่อติดต่อฉุกเฉิน</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>บันทึกการเปลี่ยนแปลง</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/home')} disabled={saving}>
              <Text style={styles.cancelBtnText}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      {/* Contact Modal */}
      <Modal visible={showContactModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingContactId ? 'แก้ไขรายชื่อ' : 'เพิ่มรายชื่อใหม่'}</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ชื่อผู้ติดต่อ</Text>
                <TextInput
                  style={styles.input}
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="เช่น ลูกชาย, ศูนย์กู้ภัย"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>เบอร์โทรศัพท์</Text>
                <TextInput
                  style={styles.input}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                  placeholder="เช่น 1669, 089xxxxxxx"
                />
              </View>
              <View style={styles.settingCard}>
                <View>
                  <Text style={styles.cardLabel}>ตั้งเป็นรายชื่อหลัก (Primary)</Text>
                  <Text style={styles.cardSubtitle}>ผู้ติดต่ออันดับแรกในกรณีฉุกเฉิน</Text>
                </View>
                <Switch
                  value={contactPrimary}
                  onValueChange={setContactPrimary}
                  trackColor={{ false: '#cbd5e1', true: '#dc2626' }}
                  thumbColor={'#ffffff'}
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveContact} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    letterSpacing: 1,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#059669',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  formSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    color: '#0f172a',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginLeft: 8,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cardCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 2,
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  copyBtn: {
    alignItems: 'center',
  },
  copyText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: 'bold',
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  shareText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  contactCardPrimary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  contactRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  primaryBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#059669',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 4,
  },
  addContactText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginTop: 8,
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalBody: {
    marginTop: 8,
  }
});
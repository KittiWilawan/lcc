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
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string | null;
  display_name: string;
  role: string;
  location: string | null;
  device_registered: boolean;
  avatar_url: string | null;
}

export default function MembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Add/Edit Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingAvatarUrl, setEditingAvatarUrl] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('สมาชิก (Member)');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMembers();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', session.user.id)
        .single();
      if (!error && data) {
        setUserProfile(data);
      }
    } catch (e) {
      console.log('Error loading user profile:', e);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true, // Request base64
    });

    if (!result.canceled) {
      setNewImage(result.assets[0].uri);
      // Strip data uri prefix if present (especially on web)
      const base64 = result.assets[0].base64 || '';
      const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
      setNewImageBase64(cleanBase64 || null);
    }
  };

  const openAddModal = () => {
    setEditingMemberId(null);
    setEditingAvatarUrl(null);
    setNewName('');
    setNewRole('สมาชิก (Member)');
    setNewImage(null);
    setNewImageBase64(null);
    setShowAddModal(true);
  };

  const openEditModal = (member: FamilyMember) => {
    setEditingMemberId(member.id);
    setEditingAvatarUrl(member.avatar_url);
    setNewName(member.display_name);
    setNewRole(member.role);
    setNewImage(member.avatar_url); // แสดงรูปเดิม
    setNewImageBase64(null);
    setShowAddModal(true);
  };

  const handleDeleteMember = (member: FamilyMember) => {
    Alert.alert(
      'ยืนยันการลบ',
      `คุณแน่ใจหรือไม่ว่าต้องการลบ "${member.display_name}" ออกจากครอบครัว?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ', style: 'destructive', onPress: async () => {
            try {
              const { error } = await supabase
                .from('family_members')
                .delete()
                .eq('id', member.id);
              if (error) throw error;
              Alert.alert('สำเร็จ', 'ลบสมาชิกเรียบร้อยแล้ว');
              loadMembers();
            } catch (error: any) {
              Alert.alert('เกิดข้อผิดพลาด', error.message);
            }
          }
        }
      ]
    );
  };

  const handleSaveMember = async () => {
    const isEditing = !!editingMemberId;

    if (!newName.trim()) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อ');
      return;
    }
    // ถ้าเป็นการเพิ่มใหม่ ต้องมีรูป
    if (!isEditing && !newImage) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาเลือกรูปภาพใบหน้า (จำเป็นสำหรับ AI)');
      return;
    }

    setSaving(true);
    try {
      const familyId = await AsyncStorage.getItem('familyId');

      if (!familyId) {
        Alert.alert('ไม่พบครอบครัว', 'คุณยังไม่ได้สร้างหรือเข้าร่วมครอบครัว กรุณาไปหน้าตั้งค่าครอบครัวก่อนครับ');
        setSaving(false);
        return;
      }

      // ใช้รูปเดิมเป็นค่าเริ่มต้น (สำหรับโหมดแก้ไข)
      let avatarUrl = isEditing ? editingAvatarUrl : null;

      // ถ้ามีการเลือกรูปใหม่ (ต่างจากรูปเดิม) ให้อัปโหลด
      const isNewImageSelected = newImage && newImage !== editingAvatarUrl;
      if (isNewImageSelected) {
        const fileName = `avatar-${Date.now()}.jpg`;
        const response = await fetch(newImage);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error details:", uploadError);
          throw new Error('อัปโหลดรูปล้มเหลว: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      if (isEditing) {
        // === โหมดแก้ไข ===
        const { error: updateError } = await supabase
          .from('family_members')
          .update({
            display_name: newName,
            role: newRole,
            avatar_url: avatarUrl,
          })
          .eq('id', editingMemberId);

        if (updateError) throw new Error('ไม่สามารถแก้ไขข้อมูลสมาชิกได้: ' + updateError.message);
        Alert.alert('สำเร็จ', 'แก้ไขข้อมูลสมาชิกเรียบร้อยแล้ว');
      } else {
        // === โหมดเพิ่มใหม่ ===
        const { error: insertError } = await supabase.from('family_members').insert([{
          family_id: familyId,
          display_name: newName,
          role: newRole,
          avatar_url: avatarUrl,
          device_registered: false,
          is_tracked: false
        }]);

        if (insertError) throw new Error('ไม่สามารถเพิ่มข้อมูลสมาชิกได้: ' + insertError.message);
        Alert.alert('สำเร็จ', 'เพิ่มสมาชิกเรียบร้อยแล้ว');
      }

      setShowAddModal(false);
      setEditingMemberId(null);
      setEditingAvatarUrl(null);
      setNewName('');
      setNewImage(null);
      setNewImageBase64(null);
      setNewRole('สมาชิก (Member)');
      loadMembers();
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
      console.log('Save Member Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const loadMembers = async () => {
    try {
      setLoading(true);
      const familyId = await AsyncStorage.getItem('familyId');

      if (!familyId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMembers(data);
      }
    } catch (error: any) {
      console.log('Error fetching members:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderMemberCard = (member: FamilyMember) => {
    const hasAlert = !member.device_registered;

    return (
      <View key={member.id} style={[styles.memberCard, hasAlert && styles.memberCardAlert]}>

        {/* Top Info */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {member.avatar_url ? (
              <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={32} color="#94a3b8" />
              </View>
            )}
          </View>

          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>{member.display_name}</Text>
              <View style={[styles.statusDot, hasAlert ? styles.statusDotRed : styles.statusDotGreen]} />
            </View>
            <Text style={[styles.memberRole, hasAlert && styles.memberRoleAlert]}>{member.role}</Text>

          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(member)}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
            <Text style={styles.editBtnText}>แก้ไข</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteMember(member)}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#dc2626" style={{ marginRight: 6 }} />
            <Text style={styles.deleteBtnText}>ลบ</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header matching Dashboard/Profile */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoPlaceholder}>
            <MaterialCommunityIcons name="shield-account" size={20} color="#059669" />
          </View>
          <Text style={styles.headerTitle}>LOOKLANCARE</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
          {userProfile?.avatar_url ? (
            <Image source={{ uri: userProfile.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
          ) : (
            <MaterialCommunityIcons name="account-outline" size={24} color="#64748b" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>สมาชิกในครอบครัว</Text>
          <Text style={styles.pageSubtitle}>จัดการและดูแลคนที่คุณรักได้ที่นี่</Text>
        </View>

        <TouchableOpacity style={styles.addMemberBtn} onPress={openAddModal}>
          <MaterialCommunityIcons name="account-plus-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.addMemberBtnText}>เพิ่มสมาชิกใหม่ (AI Tracking)</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={{ marginTop: 40 }}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <View style={styles.membersList}>
            {members.length > 0 ? (
              members.map(renderMemberCard)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>ยังไม่มีสมาชิกในครอบครัว</Text>
                <Text style={styles.emptySubtext}>กรุณาสร้างครอบครัวในหน้าตั้งค่า หรือเพิ่มสมาชิกใหม่</Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingMemberId ? 'แก้ไขข้อมูลสมาชิก' : 'เพิ่มสมาชิกใหม่'}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Image Picker */}
              <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                {newImage ? (
                  <Image source={{ uri: newImage }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialCommunityIcons name="camera-plus" size={32} color="#059669" />
                    <Text style={styles.imagePickerText}>ถ่าย/อัปโหลดใบหน้า</Text>
                    <Text style={styles.imagePickerSubtext}>(จำเป็นสำหรับ AI Tracking)</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>ชื่อ - นามสกุล</Text>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="เช่น คุณตาต้อย"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>บทบาท</Text>
                <View style={styles.roleContainer}>
                  {['คุณตา (Grandpa)', 'คุณยาย (Grandma)', 'สมาชิก (Member)'].map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleChip, newRole === role && styles.roleChipActive]}
                      onPress={() => setNewRole(role)}
                    >
                      <Text style={[styles.roleChipText, newRole === role && styles.roleChipTextActive]}>{role}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMember} disabled={saving}>
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
  container: {
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
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addMemberBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  membersList: {
    gap: 16,
  },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberCardAlert: {
    borderColor: '#059669',
    backgroundColor: '#fffdfd',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#059669',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: '#059669',
  },
  statusDotRed: {
    backgroundColor: '#0f172a', // or red
  },
  memberRole: {
    fontSize: 12,
    color: '#059669',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  memberRoleAlert: {
    color: '#b45309',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
  },
  alertText: {
    fontSize: 11,
    color: '#dc2626',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
  },
  editBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: 'bold',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingVertical: 10,
  },
  deleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
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
  },
  imagePickerBtn: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#34d399',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickedImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#059669',
  },
  imagePickerText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
  },
  imagePickerSubtext: {
    color: '#10b981',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#34d399',
  },
  roleChipText: {
    fontSize: 13,
    color: '#64748b',
  },
  roleChipTextActive: {
    color: '#059669',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AICameraOverlay from '../../components/AICameraOverlay';
import { FullScreenCameraModal } from '../../components/FullScreenCameraModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CameraItem {
  id: string;
  name: string;
  type: 'video' | 'device';
  url?: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Camera State
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [fullscreenCam, setFullscreenCam] = useState<CameraItem | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showAddCameraModal, setShowAddCameraModal] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamType, setNewCamType] = useState<'video' | 'device'>('video');
  const [newCamUrl, setNewCamUrl] = useState('');

  const [events, setEvents] = useState([
    { id: 1, time: '10:30', title: 'ตรวจพบการล้ม (ยืนยันแล้ว)', subtitle: 'เจ้าหน้าที่รับทราบและติดต่อแล้ว', isAlert: true },
    { id: 2, time: '08:15', title: 'แจ้งเตือนพลาด (False Alarm)', subtitle: 'ระบบตรวจพบการเคลื่อนไหวรวดเร็ว', isAlert: false }
  ]);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Animations
  const pulseAnim = useMemo(() => new Animated.Value(1), []);
  const glowAnim = useMemo(() => new Animated.Value(0.3), []);

  const loadCameras = async () => {
    try {
      const data = await AsyncStorage.getItem('@family_cameras');
      if (data) {
        setCameras(JSON.parse(data));
      } else {
        // Default mock camera
        const defaultCam: CameraItem = {
          id: '1',
          name: 'ห้องนั่งเล่น',
          type: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
        };
        setCameras([defaultCam]);
        await AsyncStorage.setItem('@family_cameras', JSON.stringify([defaultCam]));
      }
    } catch (e) {
      console.log('Error loading cameras', e);
    }
  };

  const handleAddCamera = async () => {
    if (newCamType === 'device') {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          alert('ต้องอนุญาตให้แอปใช้กล้องเพื่อใช้งานโหมดนี้ครับ');
          return;
        }
      }
    }

    const newCam: CameraItem = {
      id: Date.now().toString(),
      name: newCamName || (newCamType === 'device' ? 'กล้องมือถือ' : 'กล้องวงจรปิด'),
      type: newCamType,
      url: newCamType === 'video' ? newCamUrl : undefined
    };

    const updated = [...cameras, newCam];
    setCameras(updated);
    await AsyncStorage.setItem('@family_cameras', JSON.stringify(updated));
    setShowAddCameraModal(false);
    setNewCamName('');
    setNewCamUrl('');
  };

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

  const loadFamilyMembers = async () => {
    try {
      setLoadingMembers(true);
      const familyId = await AsyncStorage.getItem('familyId');
      if (!familyId) return;

      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMembers(data);
      }
    } catch (e) {
      console.log('Error loading members:', e);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFamilyMembers();
    void loadUserProfile();
    void loadCameras();

    // Pulse animation for AI status dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Glow animation for live indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim, glowAnim]);

  const toggleTracking = async (id: string, currentVal: boolean) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, is_tracked: !currentVal } : m));
    
    const { error } = await supabase
      .from('family_members')
      .update({ is_tracked: !currentVal })
      .eq('id', id);
      
    if (error) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, is_tracked: currentVal } : m));
      console.error(error);
    }
  };

  const confirmDeleteCamera = (camId: string, camName: string) => {
    Alert.alert(
      'ยืนยันการลบกล้อง',
      `คุณแน่ใจหรือไม่ว่าต้องการลบกล้อง "${camName}" ออก?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบกล้อง',
          style: 'destructive',
          onPress: async () => {
            const updated = cameras.filter(c => c.id !== camId);
            setCameras(updated);
            await AsyncStorage.setItem('@family_cameras', JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const clearEvents = () => setEvents([]);
  const addEvent = async () => {
    const timeNow = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    setEvents([
      { id: Date.now(), time: timeNow, title: 'ตรวจพบการล้ม (จำลอง)', subtitle: 'กำลังแจ้งเตือนสมาชิกในครอบครัว', isAlert: true },
      ...events
    ]);

    try {
      const historyData = await AsyncStorage.getItem('@fall_history');
      const history = historyData ? JSON.parse(historyData) : [];
      history.push({
        id: Date.now().toString(),
        type: 'simulated',
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem('@fall_history', JSON.stringify(history));
    } catch (e) {
      console.log('Error saving history', e);
    }
  };

  const trackedCount = members.filter(m => m.is_tracked).length;

  return (
    <View style={styles.root}>
      <View style={styles.safeArea}>

        {/* =========================================================
            HEADER - Glassmorphism style
           ========================================================= */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 14) }]}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/iconlnw.png')}
                style={styles.logo}
                contentFit="cover"
              />
              <View style={styles.logoOnlineDot} />
            </View>
            <View>
              <Text style={styles.appName}>LookLanCare</Text>
              <Text style={styles.familyName}>ครอบครัวสุขสันต์</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn}>
              <MaterialCommunityIcons name="bell-outline" size={22} color="#475569" />
              {events.length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{events.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
              {userProfile?.avatar_url ? (
                <Image source={{ uri: userProfile.avatar_url }} style={styles.profileAvatar} />
              ) : (
                <MaterialCommunityIcons name="account" size={22} color="#059669" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* =========================================================
              AI STATUS BANNER - Gradient-like card
             ========================================================= */}
          <View style={styles.aiBanner}>
            <View style={styles.aiBannerBg}>
              {/* Decorative circles */}
              <View style={[styles.decorCircle, { top: -20, right: -20, opacity: 0.08 }]} />
              <View style={[styles.decorCircle, { bottom: -30, left: -10, opacity: 0.05, width: 100, height: 100 }]} />
              
              <View style={styles.aiBannerContent}>
                <View style={styles.aiBannerLeft}>
                  <View style={styles.aiIconCircle}>
                    <MaterialCommunityIcons name="shield-check" size={28} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiBannerTitle}>ระบบ AI กำลังเฝ้าระวัง</Text>
                    <Text style={styles.aiBannerSubtitle}>
                      ติดตาม {trackedCount} คน • ทุกอย่างปกติ
                    </Text>
                  </View>
                </View>
                <View style={styles.aiStatusIndicator}>
                  <Animated.View style={[styles.aiPulse, { transform: [{ scale: pulseAnim }] }]} />
                  <View style={styles.aiDotActive} />
                </View>
              </View>

              {/* Quick action chips */}
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="cctv" size={14} color="#059669" />
                  <Text style={styles.chipText}>กล้อง Online</Text>
                </View>
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="wifi" size={14} color="#059669" />
                  <Text style={styles.chipText}>เชื่อมต่อแล้ว</Text>
                </View>
                <View style={[styles.chip, styles.chipActive]}>
                  <MaterialCommunityIcons name="brain" size={14} color="#ffffff" />
                  <Text style={[styles.chipText, { color: '#ffffff' }]}>AI Active</Text>
                </View>
              </View>
            </View>
          </View>

          {/* =========================================================
              CAMERA SECTION - Premium dark card
             ========================================================= */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="cctv" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>กล้องวงจรปิด</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowAddCameraModal(true)}>
                <Text style={styles.sectionAction}>+ เพิ่มกล้อง</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/all-cameras')}>
                <Text style={[styles.sectionAction, { color: '#64748b' }]}>ดูทั้งหมด</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {cameras.map(cam => (
              <View key={cam.id} style={[styles.cameraCard, { width: SCREEN_WIDTH - 40, marginRight: 16, marginBottom: 0 }]}>
                <View style={styles.cameraView}>
                  {cam.type === 'video' && cam.url ? (
                    <Image
                      source={{ uri: cam.url }}
                      style={styles.videoPlayer}
                      contentFit="cover"
                      autoplay
                    />
                  ) : (
                    <CameraView style={styles.videoPlayer} facing="back" />
                  )}

                  {/* AI Vision Person & Fall Overlay */}
                  <AICameraOverlay
                    personName="คุณยายสมศรี"
                    initialPosture="standing"
                    onFallDetected={() => { void addEvent(); }}
                  />

                  <View style={styles.liveBadge}>
                    <Animated.View style={[styles.liveDot, { opacity: glowAnim }]} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>

                  <View style={styles.hdBadge}>
                    <Text style={styles.hdText}>HD</Text>
                  </View>

                  <View style={styles.roomLabel}>
                    <MaterialCommunityIcons name={cam.type === 'device' ? "cellphone" : "cctv"} size={14} color="#ffffff" />
                    <Text style={styles.roomLabelText}>{cam.name}</Text>
                  </View>

                  {/* Bottom Right: Fullscreen Expand Only */}
                  <View style={[styles.cameraOverlayControls, { right: 8, bottom: 8, top: undefined }]}>
                    <TouchableOpacity
                      style={styles.cameraControlBtn}
                      onPress={() => setFullscreenCam(cam)}
                    >
                      <MaterialCommunityIcons name="fullscreen" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Camera Info Footer - Clean & Sleek */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name={cam.type === 'device' ? "cellphone" : "cctv"} size={14} color="#059669" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>{cam.name}</Text>
                  </View>
                  <View style={{ backgroundColor: cam.type === 'device' ? '#fef3c7' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: cam.type === 'device' ? '#92400e' : '#64748b' }}>
                      {cam.type === 'device' ? 'มือถือ' : 'CCTV'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* =========================================================
              FAMILY MEMBERS - Modern list card
             ========================================================= */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="account-group" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>สมาชิกในบ้าน</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/members')} style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>จัดการ</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#059669" />
            </TouchableOpacity>
          </View>

          <View style={styles.membersCard}>
            {loadingMembers ? (
              <ActivityIndicator color="#059669" style={{ marginVertical: 24 }} />
            ) : members.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-plus-outline" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>ยังไม่มีสมาชิกในบ้าน</Text>
                <TouchableOpacity style={styles.addMemberBtn} onPress={() => router.push('/members')}>
                  <Text style={styles.addMemberText}>+ เพิ่มสมาชิก</Text>
                </TouchableOpacity>
              </View>
            ) : (
              members.map((member, index) => (
                <View key={member.id} style={[styles.memberItem, index === members.length - 1 && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
                  <View style={[styles.memberAvatar, member.is_tracked && styles.memberAvatarActive]}>
                    {member.avatar_url ? (
                      <Image source={{uri: member.avatar_url}} style={styles.memberAvatarImg} />
                    ) : (
                      <MaterialCommunityIcons name="account" size={22} color={member.is_tracked ? '#059669' : '#94a3b8'} />
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.display_name}</Text>
                    <View style={styles.memberRoleRow}>
                      <View style={[styles.roleBadge, member.is_tracked && styles.roleBadgeActive]}>
                        <Text style={[styles.roleBadgeText, member.is_tracked && styles.roleBadgeTextActive]}>{member.role}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.trackingToggle}>
                    <Text style={[styles.trackingLabel, member.is_tracked && styles.trackingLabelActive]}>
                      {member.is_tracked ? 'กำลังดูแล' : 'ปิดอยู่'}
                    </Text>
                    <Switch 
                      value={member.is_tracked || false}
                      onValueChange={() => toggleTracking(member.id, member.is_tracked)}
                      trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                      thumbColor={member.is_tracked ? '#059669' : '#cbd5e1'}
                      style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                    />
                  </View>
                </View>
              ))
            )}
          </View>

          {/* =========================================================
              RECENT EVENTS - Timeline
             ========================================================= */}
          {events.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color="#059669" />
                  <Text style={styles.sectionTitle}>เหตุการณ์ล่าสุด</Text>
                </View>
                <TouchableOpacity onPress={clearEvents}>
                  <Text style={styles.sectionAction}>ล้าง</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.eventsCard}>
                {events.map((event, index) => (
                  <View key={event.id} style={[styles.eventItem, index === events.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={[styles.eventDot, event.isAlert ? styles.eventDotAlert : styles.eventDotNormal]} />
                    <View style={styles.eventContent}>
                      <View style={styles.eventTopRow}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventTime}>{event.time}</Text>
                      </View>
                      <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* =========================================================
              SOS BUTTON - Premium emergency button
             ========================================================= */}
          <TouchableOpacity style={styles.sosButton} activeOpacity={0.8} onPress={addEvent}>
            <View style={styles.sosInner}>
              <View style={styles.sosIconContainer}>
                <MaterialCommunityIcons name="alert-octagon" size={28} color="#ffffff" />
              </View>
              <View style={styles.sosTextContent}>
                <Text style={styles.sosTitle}>จำลองเหตุฉุกเฉิน</Text>
                <Text style={styles.sosSubtitle}>Simulate Fall Detection</Text>
              </View>
              <View style={styles.sosBadge}>
                <Text style={styles.sosBadgeText}>SOS</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
      {/* Add Camera Modal */}
      <Modal visible={showAddCameraModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>เพิ่มกล้องวงจรปิด</Text>
              <TouchableOpacity onPress={() => setShowAddCameraModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>ชื่อกล้อง / จุดติดตั้ง</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น ห้องนั่งเล่น, หน้าบ้าน"
              value={newCamName}
              onChangeText={setNewCamName}
            />

            <Text style={styles.inputLabel}>ประเภทกล้อง</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, newCamType === 'video' && styles.typeBtnActive]}
                onPress={() => setNewCamType('video')}
              >
                <MaterialCommunityIcons name="cctv" size={20} color={newCamType === 'video' ? '#059669' : '#64748b'} />
                <Text style={[styles.typeBtnText, newCamType === 'video' && styles.typeBtnTextActive]}>CCTV (URL)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, newCamType === 'device' && styles.typeBtnActive]}
                onPress={() => setNewCamType('device')}
              >
                <MaterialCommunityIcons name="cellphone" size={20} color={newCamType === 'device' ? '#059669' : '#64748b'} />
                <Text style={[styles.typeBtnText, newCamType === 'device' && styles.typeBtnTextActive]}>กล้องมือถือ</Text>
              </TouchableOpacity>
            </View>

            {newCamType === 'video' && (
              <>
                <Text style={styles.inputLabel}>ลิงก์วิดีโอ (URL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="เช่น http://.../stream.mp4"
                  value={newCamUrl}
                  onChangeText={setNewCamUrl}
                  autoCapitalize="none"
                />
              </>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddCamera}>
              <Text style={styles.saveBtnText}>บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen YouTube-Style Camera Viewer */}
      <FullScreenCameraModal
        visible={!!fullscreenCam}
        camera={fullscreenCam}
        onClose={() => setFullscreenCam(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  safeArea: {
    flex: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  logoOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  appName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  familyName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // ── AI Banner ──
  aiBanner: {
    marginBottom: 20,
  },
  aiBannerBg: {
    backgroundColor: '#059669',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
  },
  aiBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  aiBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  aiBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  aiStatusIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
  },
  aiPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  aiDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#86efac',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  chipActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#064e3b',
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },

  // ── Camera ──
  cameraCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cameraView: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  cameraDarkBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  cameraPlaceholderText: {
    color: '#475569',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hdBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  hdText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cameraOverlayControls: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  cameraControlBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  roomLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  roomLabelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Members ──
  membersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 12,
  },
  addMemberBtn: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  addMemberText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
  },
  addMemberNavTextActive: {
    color: '#059669',
    fontWeight: '700',
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    gap: 8,
  },
  typeBtnActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  typeBtnTextActive: {
    color: '#059669',
  },
  saveBtn: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  memberAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  memberAvatarActive: {
    borderColor: '#86efac',
    backgroundColor: '#ecfdf5',
  },
  memberAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 13,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  memberRoleRow: {
    flexDirection: 'row',
  },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeActive: {
    backgroundColor: '#ecfdf5',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  roleBadgeTextActive: {
    color: '#059669',
  },
  trackingToggle: {
    alignItems: 'flex-end',
  },
  trackingLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 2,
  },
  trackingLabelActive: {
    color: '#059669',
  },

  // ── Events ──
  eventsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 12,
  },
  eventDotAlert: {
    backgroundColor: '#22c55e',
  },
  eventDotNormal: {
    backgroundColor: '#cbd5e1',
  },
  eventContent: {
    flex: 1,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  eventTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 8,
  },
  eventSubtitle: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },

  // ── SOS Button ──
  sosButton: {
    marginTop: 4,
  },
  sosInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  sosIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosTextContent: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  sosSubtitle: {
    fontSize: 11,
    color: '#b91c1c',
  },
  sosBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sosBadgeText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
});

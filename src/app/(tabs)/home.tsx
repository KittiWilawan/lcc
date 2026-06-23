import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function DashboardScreen() {
  const router = useRouter();

  // Mock events array. In real app, this would come from an API/Database.
  const [events, setEvents] = useState([
    { id: 1, time: '10:30', title: 'ตรวจพบการล้ม (ยืนยันแล้ว)', subtitle: 'เจ้าหน้าที่รับทราบและติดต่อแล้ว', isAlert: true },
    { id: 2, time: '08:15', title: 'แจ้งเตือนพลาด (False Alarm)', subtitle: 'ระบบตรวจพบการเคลื่อนไหวรวดเร็ว', isAlert: false }
  ]);

  // ฟังก์ชันสลับการโชว์/ซ่อนประวัติ (จำลอง)
  // หากไม่มีเหตุการณ์ events จะเป็น array ว่าง และกล่องประวัติจะไม่โชว์
  const clearEvents = () => setEvents([]);
  const addEvent = () => setEvents([
    { id: Date.now(), time: '11:00', title: 'ตรวจพบการล้ม (จำลอง)', subtitle: 'กำลังแจ้งเตือนสมาชิกในครอบครัว', isAlert: true },
    ...events
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/iconlnw.png')}
            style={styles.logo}
            contentFit="cover"
          />
          <View>
            <Text style={styles.appName}>ลูกหลานแคร์</Text>
            <Text style={styles.familyName}>ครอบครัวสุขสันต์</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
          <MaterialCommunityIcons name="account-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Camera Section */}
        <View style={styles.cameraCard}>
          <View style={styles.cameraHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.redDot} />
              <Text style={styles.liveText}>สด (Live) - ห้องนั่งเล่น</Text>
            </View>
            <Text style={styles.hdText}>HD 1080p</Text>
          </View>

          {/* Placeholder for Camera View */}
          <View style={styles.cameraPlaceholder}>
            {/* 
              TODO: Insert RTSP Player or WebRTC Video stream component here 
              Example: <Video source={{ uri: streamUrl }} style={StyleSheet.absoluteFill} /> 
            */}

            <View style={styles.mockVideoBg}>
              <Text style={{ color: '#94a3b8' }}>ภาพจำลองกล้องวงจรปิด</Text>

              <View style={styles.cameraControls}>
                <MaterialCommunityIcons name="video-off-outline" size={20} color="#ffffff" style={{ marginRight: 12 }} />
                <MaterialCommunityIcons name="microphone-off" size={20} color="#ffffff" />
              </View>
            </View>
          </View>

          <View style={styles.cameraFooter}>
            <View style={styles.aiStatus}>
              <View style={styles.aiIconBox}>
                <MaterialCommunityIcons name="account-group" size={24} color="#0f766e" />
              </View>
              <View>
                <Text style={styles.aiStatusTitle}>กำลังเฝ้าระวัง 2 คน</Text>
                <Text style={styles.aiStatusSubtitle}>ระบบ AI ทำงานปกติ</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.refreshBtn}>
              <MaterialCommunityIcons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.refreshText}>รีเฟรช</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Family Members Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="source-branch" size={20} color="#059669" />
            <Text style={styles.cardTitle}>สมาชิกในครอบครัว</Text>
          </View>

          <View style={styles.memberItem}>
            <View style={styles.memberAvatar}>
              <MaterialCommunityIcons name="face-man" size={24} color="#64748b" />
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>คุณตา</Text>
              <Text style={styles.memberRoom}>ห้องนั่งเล่น</Text>
            </View>
            <View style={styles.statusBadgeSafe}>
              <View style={styles.statusDotSafe} />
              <Text style={styles.statusTextSafe}>ปกติ (Safe)</Text>
            </View>
          </View>

          <View style={styles.memberItem}>
            <View style={styles.memberAvatar}>
              <MaterialCommunityIcons name="face-woman" size={24} color="#64748b" />
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>คุณยาย</Text>
              <Text style={styles.memberRoom}>ห้องนั่งเล่น</Text>
            </View>
            <View style={styles.statusBadgeSafe}>
              <View style={styles.statusDotSafe} />
              <Text style={styles.statusTextSafe}>ปกติ (Safe)</Text>
            </View>
          </View>
        </View>

        {/* History Section (Conditional Rendering) */}
        {events.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="history" size={20} color="#059669" />
              <Text style={styles.cardTitle}>ประวัติเหตุการณ์ล่าสุด</Text>
            </View>

            <View style={styles.timeline}>
              {events.map((event, index) => (
                <View key={event.id} style={styles.timelineItem}>
                  <View style={[styles.timelineLine, { backgroundColor: event.isAlert ? '#10b981' : '#cbd5e1' }]} />
                  <View style={styles.timelineTimeContainer}>
                    <Text style={styles.timelineTime}>{event.time}</Text>
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{event.title}</Text>
                    <Text style={styles.timelineSubtitle}>{event.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.viewAllBtn} onPress={clearEvents}>
              <Text style={styles.viewAllText}>ซ่อนประวัติ (Demo)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SOS Simulating Button */}
        <TouchableOpacity style={styles.sosButton} onPress={addEvent}>
          <View style={styles.sosIconCircle}>
            <Text style={styles.sosText}>SOS</Text>
          </View>
          <View style={styles.sosTextContainer}>
            <MaterialCommunityIcons name="alert-outline" size={24} color="#dc2626" />
            <Text style={styles.sosButtonLabel}>จำลองเหตุฉุกเฉิน (Simulate Fall)</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
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
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  familyName: {
    fontSize: 12,
    color: '#64748b',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cameraCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  hdText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 'bold',
  },
  cameraPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  mockVideoBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#34d399',
    borderRadius: 8,
  },
  aiLabel: {
    position: 'absolute',
    top: -14,
    left: '50%',
    transform: [{ translateX: -30 }],
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  aiLabelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
  },
  cameraFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  aiStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiStatusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  aiStatusSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginLeft: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  memberRoom: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadgeSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDotSafe: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
    marginRight: 4,
  },
  statusTextSafe: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#166534',
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 45,
    top: 0,
    bottom: -20,
    width: 2,
  },
  timelineTimeContainer: {
    width: 45,
    paddingTop: 2,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginLeft: 16,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  viewAllBtn: {
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sosButton: {
    borderWidth: 2,
    borderColor: '#dc2626',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 8,
  },
  sosIconCircle: {
    position: 'absolute',
    right: -10,
    top: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sosTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonLabel: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
  }
});

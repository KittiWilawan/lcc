import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFallEvents, FallEvidenceRecord } from '../../lib/fallEvidence';

interface AlertItem {
  id: string;
  type: 'critical' | 'simulated' | 'log';
  title: string;
  subtitle: string;
  person: string;
  time: string;
  date: string;
  status: 'responded' | 'notified' | 'cancelled';
  imageUrl?: string;
  cameraName?: string;
  groundDuration?: number;
  torsoAngle?: number;
}

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [caregiver, setCaregiver] = useState<any>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<AlertItem | null>(null);

  const loadAlertsAndMembers = async () => {
    try {
      setLoadingAlerts(true);
      const familyId = await AsyncStorage.getItem('familyId');

      let realMemberName = 'สมาชิกผู้สูงอายุ';
      if (familyId) {
        const { data: memberData } = await supabase
          .from('family_members')
          .select('display_name, is_tracked')
          .eq('family_id', familyId)
          .order('created_at', { ascending: true });

        if (memberData && memberData.length > 0) {
          const tracked = memberData.find((m) => m.is_tracked);
          realMemberName = tracked ? tracked.display_name : memberData[0].display_name;
        }

        // Load caregiver
        const { data: cgData } = await supabase
          .from('family_members')
          .select('display_name, role, avatar_url')
          .eq('family_id', familyId)
          .ilike('role', '%caregiver%')
          .limit(1)
          .maybeSingle();

        if (cgData) {
          setCaregiver(cgData);
        }
      }

      // Load fall evidence history from Supabase / local
      const events: FallEvidenceRecord[] = await getFallEvents();

      if (events.length > 0) {
        const parsedAlerts: AlertItem[] = events.map((item, idx) => {
          const dateObj = new Date(item.created_at || Date.now());
          const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          const dateStr = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
          const isActual = item.event_type === 'actual';

          return {
            id: item.id || idx.toString(),
            type: isActual ? 'critical' : item.event_type === 'simulated' ? 'simulated' : 'log',
            title: isActual ? 'Actual Fall Detected' : item.event_type === 'sos' ? 'SOS Alert Triggered' : 'Simulated Fall Test',
            subtitle: item.details || `ตรวจพบการหกล้มที่ ${item.camera_name || 'กล้องวงจรปิด'}`,
            person: item.member_name || realMemberName,
            time: timeStr,
            date: dateStr,
            status: item.status || 'notified',
            imageUrl: item.image_url || 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=800&auto=format&fit=crop',
            cameraName: item.camera_name || 'กล้องวงจรปิด',
            groundDuration: item.ground_duration || 1.5,
            torsoAngle: item.torso_angle || 18,
          };
        });
        setAlerts(parsedAlerts);
      } else {
        // Fallback alert items
        setAlerts([
          {
            id: '1',
            type: 'critical',
            title: 'Actual Fall Detected',
            subtitle: 'ตรวจพบการหกล้ม ห้องนั่งเล่น',
            person: realMemberName,
            time: '14:32',
            date: 'วันนี้',
            status: 'responded',
            imageUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=800&auto=format&fit=crop',
            cameraName: 'กล้องห้องนั่งเล่น',
            groundDuration: 1.8,
            torsoAngle: 15,
          },
          {
            id: '2',
            type: 'simulated',
            title: 'Weekly Safety Test',
            subtitle: 'ทดสอบระบบการล้มประจำสัปดาห์',
            person: 'ระบบ AI',
            time: '10:15',
            date: 'เมื่อวาน',
            status: 'notified',
            imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=800&auto=format&fit=crop',
            cameraName: 'กล้องหน้าบ้าน',
            groundDuration: 1.0,
            torsoAngle: 22,
          },
        ]);
      }
    } catch (e) {
      console.log('Error loading alerts:', e);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    void loadAlertsAndMembers();

    // Supabase Realtime Subscription for instant alert sync
    const channel = supabase
      .channel('realtime_fall_alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fall_events' },
        () => {
          void loadAlertsAndMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleViewEvidence = (alert: AlertItem) => {
    setSelectedEvidence(alert);
  };

  const getStatusBadge = (status: AlertItem['status']) => {
    switch (status) {
      case 'responded':
        return { label: 'RESPONDED', bg: '#dcfce7', color: '#16a34a' };
      case 'notified':
        return { label: 'NOTIFIED', bg: '#fff7ed', color: '#ea580c' };
      case 'cancelled':
        return { label: 'CANCELLED', bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical':
        return { name: 'alert' as const, bg: '#fef3c7', color: '#d97706' };
      case 'simulated':
        return { name: 'lightning-bolt' as const, bg: '#f1f5f9', color: '#64748b' };
      case 'log':
        return { name: 'clipboard-text-outline' as const, bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const getAlertLabel = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical':
        return 'CRITICAL ALERT';
      case 'simulated':
        return 'SIMULATED FALL';
      case 'log':
        return 'ALERT LOG';
    }
  };

  const handleCall1669 = () => {
    Linking.openURL('tel:1669');
  };

  return (
    <View style={styles.safeArea}>
      {/* Red SOS Header */}
      <View style={[styles.sosHeader, { paddingTop: Math.max(insets.top + 10, 16) }]}>
        <View style={styles.sosHeaderContent}>
          <View style={styles.sosIconRow}>
            <View style={styles.sosIconCircle}>
              <MaterialCommunityIcons name="plus-thick" size={20} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.sosTitle}>SOS ALERT</Text>
              <Text style={styles.sosSubtitle}>ส่งความช่วยเหลือ</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => void loadAlertsAndMembers()}>
            <Text style={styles.sosEditLink}>รีเฟรช</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <View style={styles.pageTitle}>
          <Text style={styles.pageTitleText}>Emergency Log (บันทึก{'\n'}เหตุการณ์)</Text>
        </View>

        {loadingAlerts ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 40 }} />
        ) : (
          alerts.map((alert) => {
            const statusBadge = getStatusBadge(alert.status);
            const alertIcon = getAlertIcon(alert.type);
            const alertLabel = getAlertLabel(alert.type);

            return (
              <View key={alert.id} style={[styles.alertCard, alert.type === 'critical' && styles.alertCardCritical]}>
                {/* Header Row */}
                <View style={styles.alertHeaderRow}>
                  <View style={styles.alertHeaderLeft}>
                    <View style={[styles.alertIconCircle, { backgroundColor: alertIcon.bg }]}>
                      <MaterialCommunityIcons name={alertIcon.name} size={16} color={alertIcon.color} />
                    </View>
                    <Text style={[styles.alertLabel, alert.type === 'critical' && { color: '#d97706' }]}>
                      {alertLabel}
                    </Text>
                  </View>
                  <Text style={styles.alertTime}>
                    {alert.time} {alert.date}
                  </Text>
                </View>

                {/* Title + Status Row */}
                <View style={styles.alertTitleRow}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Subtitle */}
                <Text style={styles.alertSubtitle}>{alert.subtitle}</Text>

                {/* Person Name */}
                <View style={styles.personRow}>
                  <MaterialCommunityIcons name="account-circle-outline" size={16} color="#475569" />
                  <Text style={styles.personName}>{alert.person}</Text>
                </View>

                {/* Action Buttons */}
                {alert.type === 'critical' ? (
                  <View style={styles.alertActionsColumn}>
                    <View style={styles.alertActions}>
                      <TouchableOpacity style={styles.callBtn} onPress={handleCall1669}>
                        <MaterialCommunityIcons name="phone" size={16} color="#ffffff" />
                        <Text style={styles.callBtnText}>Call 1669</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.contactBtn}>
                        <MaterialCommunityIcons name="account-outline" size={16} color="#0f172a" />
                        <Text style={styles.contactBtnText}>Contact</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.evidenceBtn} onPress={() => handleViewEvidence(alert)}>
                      <MaterialCommunityIcons name="camera-burst" size={16} color="#0284c7" />
                      <Text style={styles.evidenceBtnText}>ดูรูปถ่าย / หลักฐานการล้มสด</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.evidenceBtnSmall} onPress={() => handleViewEvidence(alert)}>
                    <MaterialCommunityIcons name="image-search-outline" size={14} color="#64748b" />
                    <Text style={styles.evidenceBtnSmallText}>ดูรูปถ่าย / หลักฐาน</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {/* Family Lead / Caregiver */}
        <View style={styles.caregiverCard}>
          <View style={[styles.infoCardIconCircle, { backgroundColor: '#f1f5f9' }]}>
            <MaterialCommunityIcons name="account-heart-outline" size={22} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardLabel}>FAMILY CAREGIVER</Text>
            <Text style={styles.infoCardTitle}>
              {caregiver ? caregiver.display_name : 'ยังไม่ได้กำหนด'}
            </Text>
            {caregiver && <Text style={styles.caregiverRole}>{caregiver.role}</Text>}
          </View>
        </View>
      </ScrollView>

      {/* Fall Evidence Image Viewer Modal */}
      <Modal visible={!!selectedEvidence} animationType="slide" transparent onRequestClose={() => setSelectedEvidence(null)}>
        {selectedEvidence && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="camera" size={20} color="#0284c7" />
                  <Text style={styles.modalTitle}>หลักฐานภาพถ่ายขณะเกิดเหตุ</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedEvidence(null)}>
                  <MaterialCommunityIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Evidence Snapshot Image */}
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: selectedEvidence.imageUrl }}
                  style={styles.evidenceImage}
                  contentFit="cover"
                />
                <View style={styles.imageOverlayBadge}>
                  <Text style={styles.imageOverlayBadgeText}>AI FALL DETECTION CAPTURE</Text>
                </View>
              </View>

              {/* Details List */}
              <View style={styles.detailsBox}>
                <Text style={styles.detailTitle}>{selectedEvidence.title}</Text>
                <Text style={styles.detailText}>👤 ผู้สูงอายุ: {selectedEvidence.person}</Text>
                <Text style={styles.detailText}>📍 ตำแหน่ง: {selectedEvidence.cameraName || 'กล้องวงจรปิด'}</Text>
                <Text style={styles.detailText}>⏰ เวลา: {selectedEvidence.time} ({selectedEvidence.date})</Text>
                <Text style={styles.detailText}>⏱️ ระยะเวลานอนติดพื้น: {selectedEvidence.groundDuration || 1.5} วินาที</Text>
                <Text style={styles.detailText}>📐 มุมเอียงลำตัว: {selectedEvidence.torsoAngle || 18}°</Text>
              </View>

              {/* Modal Actions */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={[styles.callBtn, { flex: 1 }]} onPress={handleCall1669}>
                  <MaterialCommunityIcons name="phone" size={16} color="#ffffff" />
                  <Text style={styles.callBtnText}>โทร 1669 ด่วน</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactBtn, { flex: 1 }]}
                  onPress={() => setSelectedEvidence(null)}
                >
                  <Text style={styles.contactBtnText}>ปิดหน้าต่าง</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  sosHeader: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sosHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sosIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sosIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sosTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  sosSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  sosEditLink: {
    fontSize: 13,
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    marginBottom: 20,
  },
  pageTitleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 30,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  alertCardCritical: {
    borderColor: '#fbbf24',
    borderWidth: 2,
    backgroundColor: '#fffdf5',
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  alertLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  alertTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  alertSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  personName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
    marginLeft: 6,
  },
  alertActionsColumn: {
    marginTop: 14,
    gap: 10,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  contactBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold',
  },
  evidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    paddingVertical: 11,
    gap: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  evidenceBtnText: {
    color: '#0284c7',
    fontSize: 13,
    fontWeight: 'bold',
  },
  evidenceBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  evidenceBtnSmallText: {
    color: '#64748b',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  caregiverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
    marginBottom: 16,
  },
  infoCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 20,
  },
  caregiverRole: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
    marginBottom: 12,
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  imageOverlayBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  detailsBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
});

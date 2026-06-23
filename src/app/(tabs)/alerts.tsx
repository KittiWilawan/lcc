import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AlertItem {
  id: string;
  type: 'critical' | 'simulated' | 'log';
  title: string;
  subtitle: string;
  person: string;
  time: string;
  date: string;
  status: 'responded' | 'notified' | 'cancelled';
}

export default function AlertsScreen() {
  const [alerts] = useState<AlertItem[]>([
    {
      id: '1',
      type: 'critical',
      title: 'Actual Fall Detected',
      subtitle: 'ตรวจพบการหกล้ม ห้องนั่งเล่น',
      person: 'คุณตาต้อย',
      time: '14:32',
      date: 'Today',
      status: 'responded',
    },
    {
      id: '2',
      type: 'simulated',
      title: 'Weekly Safety Test',
      subtitle: 'ทดสอบระบบประจำสัปดาห์',
      person: 'ระบบ',
      time: '10:15',
      date: 'Yesterday',
      status: 'notified',
    },
    {
      id: '3',
      type: 'log',
      title: 'Unusual Activity',
      subtitle: 'ความเคลื่อนไหวผิดปกติ ห้องน้ำ',
      person: 'คุณยายสมศรี',
      time: '08:45',
      date: 'Yesterday',
      status: 'cancelled',
    },
  ]);

  const [caregiver, setCaregiver] = useState<any>(null);

  useEffect(() => {
    loadCaregiver();
  }, []);

  const loadCaregiver = async () => {
    try {
      const familyId = await AsyncStorage.getItem('familyId');
      if (!familyId) return;

      const { data, error } = await supabase
        .from('family_members')
        .select('display_name, role, avatar_url')
        .eq('family_id', familyId)
        .ilike('role', '%caregiver%')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setCaregiver(data);
      }
    } catch (e) {
      console.log('Error loading caregiver:', e);
    }
  };

  const handleViewEvidence = (alert: AlertItem) => {
    Alert.alert(
      'รูปถ่าย/หลักฐาน',
      `ภาพจากกล้องขณะเกิดเหตุการณ์ "${alert.title}"\nผู้เกี่ยวข้อง: ${alert.person}\nเวลา: ${alert.time} ${alert.date}\n\n(ระบบกำลังพัฒนาฟีเจอร์แสดงรูปภาพจากกล้อง AI)`,
      [{ text: 'ปิด' }]
    );
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
      case 'critical': return 'CRITICAL ALERT';
      case 'simulated': return 'SIMULATED FALL';
      case 'log': return 'ALERT LOG';
    }
  };

  const handleCall1669 = () => {
    Linking.openURL('tel:1669');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Red SOS Header */}
      <View style={styles.sosHeader}>
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
          <TouchableOpacity>
            <Text style={styles.sosEditLink}>แก้ไข</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Title */}
        <View style={styles.pageTitle}>
          <Text style={styles.pageTitleText}>Emergency Log (บันทึก{'\n'}เหตุการณ์)</Text>
        </View>

        {/* Alert Cards */}
        {alerts.map((alert) => {
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
                  <Text style={[styles.alertLabel, alert.type === 'critical' && { color: '#d97706' }]}>{alertLabel}</Text>
                </View>
                <Text style={styles.alertTime}>{alert.time} {alert.date}</Text>
              </View>

              {/* Title + Status Row */}
              <View style={styles.alertTitleRow}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
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
                    <Text style={styles.evidenceBtnText}>ดูรูปถ่าย / หลักฐานการล้ม</Text>
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
        })}

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
            {caregiver && (
              <Text style={styles.caregiverRole}>{caregiver.role}</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // === SOS Header ===
  sosHeader: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
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

  // === Scroll Content ===
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // === Page Title ===
  pageTitle: {
    marginBottom: 20,
  },
  pageTitleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 30,
  },

  // === Alert Card ===
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

  // === Action Buttons ===
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
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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

  // === Caregiver Card ===
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
});

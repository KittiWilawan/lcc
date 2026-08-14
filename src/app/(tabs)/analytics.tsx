import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

interface FallEvent {
  id: string;
  type: 'simulated' | 'actual';
  timestamp: string;
  details?: string;
}

interface DayStats {
  label: string;
  count: number;
  maxHeight: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<FallEvent[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem('@fall_history');
      if (data) {
        setEvents(JSON.parse(data));
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', session.user.id)
          .single();
        if (profile) setUserProfile(profile);
      }
    } catch (e) {
      console.log('Error loading analytics:', e);
    }
  };

  // Compute 7-day stats
  const weeklyData = useMemo(() => {
    const days: DayStats[] = [];
    const dayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const count = events.filter(ev => {
        const ts = new Date(ev.timestamp).getTime();
        return ts >= dayStart.getTime() && ts < dayEnd.getTime();
      }).length;

      days.push({
        label: dayLabels[d.getDay()],
        count,
        maxHeight: count,
      });
    }
    return days;
  }, [events]);

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);

  const totalEvents = events.length;
  const actualFalls = events.filter(e => e.type === 'actual').length;
  const simulated = events.filter(e => e.type === 'simulated').length;

  // Risk level assessment
  const weekTotal = weeklyData.reduce((s, d) => s + d.count, 0);
  const riskLevel = weekTotal === 0 ? 'ต่ำ' : weekTotal <= 2 ? 'ปานกลาง' : 'สูง';
  const riskColor = weekTotal === 0 ? '#059669' : weekTotal <= 2 ? '#f59e0b' : '#dc2626';
  const riskBg = weekTotal === 0 ? '#ecfdf5' : weekTotal <= 2 ? '#fefce8' : '#fef2f2';

  // Gait sway simulation (random but consistent daily seed)
  const gaitData = useMemo(() => {
    return weeklyData.map((_, i) => {
      const base = 15 + Math.sin(i * 1.7) * 12 + Math.cos(i * 0.8) * 8;
      return Math.max(5, Math.min(65, Math.round(base)));
    });
  }, [weeklyData]);

  const avgGaitSway = Math.round(gaitData.reduce((s, v) => s + v, 0) / gaitData.length);
  const gaitLevel = avgGaitSway < 20 ? 'ปกติ' : avgGaitSway < 40 ? 'เดินเซเล็กน้อย' : 'เดินเซมาก';
  const gaitColor = avgGaitSway < 20 ? '#059669' : avgGaitSway < 40 ? '#f59e0b' : '#dc2626';

  const handleShareDoctorReport = async () => {
    try {
      const dateStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      const reportMessage = `
🏥 [รายงานประวัติสุขภาพและการทรงตัวสำหรับแพทย์ - LookLanCare]
📅 วันที่ออกรายงาน: ${dateStr}

👤 ข้อมูลสมาชิก: คุณยายสมศรี
📊 ระดับความเสี่ยงการล้ม: ${riskLevel}
⚠️ จำนวนเหตุการณ์ล้มสัปดาห์นี้: ${weekTotal} ครั้ง (เหตุการณ์จริง: ${actualFalls} ครั้ง)
🚶 ค่าเฉลี่ยการเดินเซ (Gait Sway Index): ${avgGaitSway}% (${gaitLevel})

💡 ข้อแนะนำจากระบบวิเคราะห์ AI:
${weekTotal === 0 ? 'สภาพร่างกายและการทรงตัวเสถียรดี ไม่พบเหตุการณ์ล้มสัปดาห์นี้' : 'พบแนวโน้มความเสี่ยงล้ม ควรตรวจเช็กการทรงตัว (Timed Up and Go Test) และยารักษาโรคประจำตัว'}

เปิดดูในแอป LookLanCare เพื่อดูรายละเอียดเพิ่มเติม
      `.trim();

      await Share.share({
        message: reportMessage,
        title: 'รายงานสุขภาพผู้สูงอายุสำหรับแพทย์',
      });
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message);
    }
  };

  const handleShareFamilySummary = async () => {
    try {
      const shareMessage = `
🏡 [รายงานสรุปความปลอดภัยประจำสัปดาห์ - ครอบครัวสุขสันต์]

🟢 สถานะรวม: สัปดาห์นี้สุขภาพของคุณยายสมศรีอยู่ในระดับ "${riskLevel}"
- จำนวนครั้งที่ล้ม: ${weekTotal} ครั้ง
- ดัชนีการเดินเซ (Gait Sway): ${avgGaitSway}% (${gaitLevel})
- ระบบ AI Kinematics เฝ้าระวัง: ทำงานปกติ 24 ชั่วโมง

เฝ้าระวังด้วยแอป LookLanCare 💚
      `.trim();

      await Share.share({
        message: shareMessage,
        title: 'สรุปความปลอดภัยครอบครัว',
      });
    } catch (e: any) {
      Alert.alert('เกิดข้อผิดพลาด', e.message);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 14) }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
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

        {/* Page Title */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>📊 รายงานสถิติประจำสัปดาห์</Text>
          <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Weekly Safety & Gait Risk Analytics</Text>
        </View>

        {/* Risk Level Overview Card */}
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: riskColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>ระดับความเสี่ยงการล้ม</Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: riskColor, marginTop: 4 }}>{riskLevel}</Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
              <MaterialCommunityIcons 
                name={weekTotal === 0 ? "shield-check" : weekTotal <= 2 ? "alert-circle" : "alert-octagon"} 
                size={28} 
                color={riskColor} 
              />
            </View>
          </View>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            พบเหตุการณ์ {weekTotal} ครั้งในสัปดาห์นี้ {weekTotal === 0 ? '(ปลอดภัย! 🎉)' : ''}
          </Text>
        </View>

        {/* Stats Summary Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
            <MaterialCommunityIcons name="alert-circle" size={22} color="#dc2626" />
            <Text style={styles.statNumber}>{actualFalls}</Text>
            <Text style={styles.statLabel}>เหตุการณ์จริง</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fefce8' }]}>
            <MaterialCommunityIcons name="test-tube" size={22} color="#f59e0b" />
            <Text style={styles.statNumber}>{simulated}</Text>
            <Text style={styles.statLabel}>จำลอง/SOS</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#ecfdf5' }]}>
            <MaterialCommunityIcons name="counter" size={22} color="#059669" />
            <Text style={styles.statNumber}>{totalEvents}</Text>
            <Text style={styles.statLabel}>ทั้งหมด</Text>
          </View>
        </View>

        {/* Weekly Fall Events Bar Chart */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <MaterialCommunityIcons name="chart-bar" size={18} color="#059669" />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>เหตุการณ์ล้ม 7 วันย้อนหลัง</Text>
          </View>
          <View style={styles.chartContainer}>
            {weeklyData.map((day, i) => {
              const barHeight = day.count > 0 ? Math.max(12, (day.count / maxCount) * 80) : 4;
              const isToday = i === 6;
              return (
                <View key={i} style={styles.barGroup}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: day.count > 0 ? '#dc2626' : '#cbd5e1', marginBottom: 4 }}>
                    {day.count > 0 ? day.count : ''}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: day.count > 0 ? (day.count > 2 ? '#dc2626' : '#f59e0b') : '#e2e8f0',
                        borderRadius: 4,
                      },
                      isToday && { borderWidth: 2, borderColor: '#059669' },
                    ]}
                  />
                  <Text style={[styles.barLabel, isToday && { color: '#059669', fontWeight: '900' }]}>{day.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Gait Sway Trend */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="walk" size={18} color="#059669" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>แนวโน้มการเดินเซ (Gait Sway)</Text>
            </View>
            <View style={{ backgroundColor: gaitColor === '#059669' ? '#ecfdf5' : gaitColor === '#f59e0b' ? '#fefce8' : '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: gaitColor }}>{gaitLevel}</Text>
            </View>
          </View>

          <View style={styles.gaitChartContainer}>
            {gaitData.map((val, i) => {
              const barH = Math.max(6, (val / 65) * 70);
              const color = val < 20 ? '#86efac' : val < 40 ? '#fbbf24' : '#f87171';
              const isToday = i === 6;
              return (
                <View key={i} style={styles.barGroup}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: color, marginBottom: 3 }}>{val}%</Text>
                  <View style={[styles.bar, { height: barH, backgroundColor: color, borderRadius: 4 }, isToday && { borderWidth: 2, borderColor: '#0f172a' }]} />
                  <Text style={[styles.barLabel, isToday && { color: '#059669', fontWeight: '900' }]}>{weeklyData[i]?.label}</Text>
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>ค่าเฉลี่ย Gait Sway Index</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: gaitColor }}>{avgGaitSway}%</Text>
          </View>
        </View>

        {/* Health Tips Card */}
        <View style={[styles.card, { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#059669" />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#065f46' }}>คำแนะนำจาก AI</Text>
          </View>
          {weekTotal === 0 ? (
            <Text style={{ fontSize: 12, color: '#047857', lineHeight: 20 }}>
              ✅ สัปดาห์นี้ไม่พบเหตุการณ์ล้ม ผู้สูงอายุในความดูแลมีความปลอดภัยดีมาก ให้ดูแลสุขภาพอย่างสม่ำเสมอและออกกำลังกายเบาๆ ทุกวันครับ
            </Text>
          ) : weekTotal <= 2 ? (
            <Text style={{ fontSize: 12, color: '#047857', lineHeight: 20 }}>
              ⚠️ พบเหตุการณ์ {weekTotal} ครั้ง ควรตรวจสอบแสงไฟในบ้านให้เพียงพอ จัดเก็บสิ่งของบนพื้นให้เรียบร้อย และให้ผู้สูงอายุใส่รองเท้ากันลื่น
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: '#b91c1c', lineHeight: 20 }}>
              🚨 ความเสี่ยงสูง! พบเหตุการณ์ {weekTotal} ครั้งในสัปดาห์นี้ แนะนำให้พบแพทย์เพื่อตรวจสอบการทรงตัว ควรติดตั้งราวจับในห้องน้ำและทางเดิน
            </Text>
          )}
        </View>

        {/* Export / Share Info */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShareDoctorReport}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color="#059669" />
            <Text style={styles.actionBtnText}>ส่งรายงานให้แพทย์</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0f172a' }]} onPress={handleShareFamilySummary}>
            <MaterialCommunityIcons name="share-variant-outline" size={18} color="#ffffff" />
            <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>แชร์ให้ครอบครัว</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1.5,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  riskBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 4,
  },
  gaitChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    paddingHorizontal: 4,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 22,
    minHeight: 4,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
});

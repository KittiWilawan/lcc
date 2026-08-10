import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

export interface HistoryEvent {
  id: string;
  type: 'actual' | 'simulated';
  timestamp: string;
  details?: string;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem('@fall_history');
      if (data) {
        const parsed = JSON.parse(data) as HistoryEvent[];
        // เรียงจากใหม่ไปเก่า
        parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistory(parsed);
      }
    } catch (e) {
      console.log('Error loading history', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // โหลดประวัติเมื่อเข้ามาหน้านี้ทุกครั้ง
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('@fall_history');
      setHistory([]);
    } catch (e) {
      console.log('Error clearing history', e);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 14) }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoPlaceholder}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#059669" />
          </View>
          <Text style={styles.headerTitle}>ประวัติเหตุการณ์</Text>
        </View>
        
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>ล้างทั้งหมด</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>ประวัติการตรวจจับการล้ม</Text>
          <Text style={styles.pageSubtitle}>บันทึกเหตุการณ์ทั้งหมดที่ AI ตรวจพบ</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>ยังไม่มีประวัติเหตุการณ์</Text>
            <Text style={styles.emptySubtext}>เหตุการณ์ปกติดี ไม่มีใครล้ม</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {history.map((event, index) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  {index !== history.length - 1 && <View style={styles.line} />}
                  <View style={[styles.dot, event.type === 'actual' ? styles.dotRed : styles.dotYellow]} />
                </View>
                
                <View style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>
                      {event.type === 'actual' ? 'ตรวจพบการล้ม (จริง)' : 'จำลองเหตุฉุกเฉิน'}
                    </Text>
                    <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
                  </View>
                  
                  <View style={styles.eventDetailsRow}>
                    <MaterialCommunityIcons 
                      name={event.type === 'actual' ? "alert-circle" : "shield-alert-outline"} 
                      size={16} 
                      color={event.type === 'actual' ? "#ef4444" : "#eab308"} 
                    />
                    <Text style={styles.eventDate}>{formatDate(event.timestamp)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
    fontSize: 15,
    fontWeight: 'bold',
    color: '#059669',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  timeline: {
    marginTop: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  line: {
    position: 'absolute',
    top: 24,
    bottom: -20,
    width: 2,
    backgroundColor: '#e2e8f0',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dotRed: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dotYellow: {
    backgroundColor: '#eab308',
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  eventTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  eventDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
});

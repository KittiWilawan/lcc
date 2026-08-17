import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { CameraView } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AICameraOverlay from '../components/AICameraOverlay';
import { FullScreenCameraModal } from '../components/FullScreenCameraModal';
import { RealStreamPlayer } from '../components/RealStreamPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 16;
const CARD_WIDTH = SCREEN_WIDTH - 40;

interface CameraItem {
  id: string;
  name: string;
  type: 'video' | 'device';
  url?: string;
}

export default function AllCamerasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [fullscreenCam, setFullscreenCam] = useState<CameraItem | null>(null);

  const loadCameras = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('@family_cameras');
      if (data) {
        setCameras(JSON.parse(data));
      }
    } catch (e) {
      console.log('Error loading cameras', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadCameras();
    }, [loadCameras])
  );

  const removeCamera = (id: string, name: string) => {
    Alert.alert(
      'ยืนยันการลบกล้อง',
      `คุณแน่ใจหรือไม่ว่าต้องการลบกล้อง "${name}" ออกจากระบบ?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบกล้อง',
          style: 'destructive',
          onPress: async () => {
            const updated = cameras.filter(c => c.id !== id);
            setCameras(updated);
            await AsyncStorage.setItem('@family_cameras', JSON.stringify(updated));
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 14) }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.logoPlaceholder}>
            <MaterialCommunityIcons name="cctv" size={20} color="#059669" />
          </View>
          <Text style={styles.headerTitle}>กล้องทั้งหมด</Text>
        </View>
        <View style={styles.cameraBadge}>
          <Text style={styles.cameraBadgeText}>{cameras.length} ตัว</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {cameras.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cctv" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>ยังไม่มีกล้องวงจรปิด</Text>
            <Text style={styles.emptySubtext}>เพิ่มกล้องได้จากหน้าหลัก</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {cameras.map(cam => (
              <View key={cam.id} style={styles.gridCard}>
                <View style={styles.gridCameraView}>
                  <RealStreamPlayer
                    type={cam.type}
                    url={cam.url}
                    style={styles.gridVideo}
                  />

                  {/* AI Vision Person & Fall Overlay */}
                  <AICameraOverlay
                    personName={cam.name}
                    initialPosture="standing"
                    compact={false}
                  />

                  {/* Live badge */}
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>

                  {/* Bottom Right Control: Fullscreen Expand Button */}
                  <View style={styles.bottomRightControls}>
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => setFullscreenCam(cam)}
                    >
                      <MaterialCommunityIcons name="fullscreen" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Camera Info Footer Bar */}
                <View style={styles.gridCardInfo}>
                  <View style={styles.gridCardInfoLeft}>
                    <MaterialCommunityIcons
                      name={cam.type === 'device' ? 'cellphone' : 'cctv'}
                      size={14}
                      color="#059669"
                    />
                    <Text style={styles.gridCardName} numberOfLines={1}>{cam.name}</Text>
                  </View>

                  <View style={[styles.typeBadge, cam.type === 'device' && styles.typeBadgeDevice]}>
                    <Text style={[styles.typeBadgeText, cam.type === 'device' && styles.typeBadgeTextDevice]}>
                      {cam.type === 'device' ? 'มือถือ' : 'CCTV'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  cameraBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cameraBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  gridCameraView: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  gridVideo: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomRightControls: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 20,
  },
  expandBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  gridCardInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  gridCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  typeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeDevice: {
    backgroundColor: '#fef3c7',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  typeBadgeTextDevice: {
    color: '#92400e',
  },
});

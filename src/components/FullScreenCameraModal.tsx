import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { CameraView } from 'expo-camera';
import AICameraOverlay from './AICameraOverlay';

interface FullScreenCameraModalProps {
  visible: boolean;
  camera: {
    id: string;
    name: string;
    type: 'video' | 'device';
    url?: string;
  } | null;
  onClose: () => void;
}

export const FullScreenCameraModal = React.memo(function FullScreenCameraModal({
  visible,
  camera,
  onClose,
}: FullScreenCameraModalProps) {
  if (!camera) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Fullscreen Video/Camera Feed */}
        {camera.type === 'video' && camera.url ? (
          <Image
            source={{ uri: camera.url }}
            style={styles.fullFeed}
            contentFit="cover"
            autoplay
          />
        ) : (
          <CameraView style={styles.fullFeed} facing="back" />
        )}

        {/* Real AI Vision Overlay */}
        <AICameraOverlay personName={camera.name} initialPosture="standing" />

        {/* Top Control Header Bar */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE FULLSCREEN</Text>
            </View>
            <Text style={styles.cameraName} numberOfLines={1}>{camera.name}</Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <MaterialCommunityIcons name="fullscreen-exit" size={24} color="#ffffff" />
            <Text style={styles.closeBtnText}>ย่อหน้าจอ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  fullFeed: {
    width: '100%',
    height: '100%',
  },
  topHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cameraName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

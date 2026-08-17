import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { parseStreamUrl } from '../lib/realAIEngine';

interface RealStreamPlayerProps {
  type: 'video' | 'device' | 'rtsp';
  url?: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ResizeMode;
  isMuted?: boolean;
  shouldPlay?: boolean;
  onPlaybackError?: (error: string) => void;
}

export const RealStreamPlayer = React.memo(function RealStreamPlayer({
  type,
  url,
  style,
  resizeMode = ResizeMode.COVER,
  isMuted = true,
  shouldPlay = true,
  onPlaybackError,
}: RealStreamPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<Video>(null);

  const parsed = url ? parseStreamUrl(url) : { protocol: 'unknown', isLiveStream: false, displayUrl: '' };
  const effectiveUrl = parsed.displayUrl || url || '';

  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [url, type, retryCount]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryCount((prev) => prev + 1);
  };

  // Local Device Camera
  if (type === 'device') {
    return (
      <View style={[styles.container, style]}>
        <CameraView
          style={styles.fullMedia}
          facing="back"
          onCameraReady={() => setLoading(false)}
        />
      </View>
    );
  }

  // Error State Fallback UI
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <MaterialCommunityIcons name="video-off-outline" size={36} color="#ef4444" />
        <Text style={styles.errorText}>ไม่สามารถเชื่อมต่อสัญญาณสตรีม</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <MaterialCommunityIcons name="refresh" size={16} color="#ffffff" />
          <Text style={styles.retryBtnText}>ลองเชื่อมต่อใหม่ ({retryCount})</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Web HTML5 Video element handling for direct web streams
  if (Platform.OS === 'web' && effectiveUrl) {
    return (
      <View style={[styles.container, style]}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>กำลังเชื่อมต่อสตรีมกล้อง IP...</Text>
          </View>
        )}
        <video
          src={effectiveUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: resizeMode === ResizeMode.COVER ? 'cover' : 'contain',
            backgroundColor: '#000000',
          }}
          autoPlay={shouldPlay}
          muted={isMuted}
          playsInline
          loop
          onLoadedData={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            const msg = parsed.protocol === 'rtsp'
              ? 'RTSP Direct Stream (ต้องใช้ HLS proxy สำหรับ Web/Mobile)'
              : 'เกิดข้อผิดพลาดในการโหลดวิดีโอ';
            setError(msg);
            if (onPlaybackError) onPlaybackError(msg);
          }}
        />
      </View>
    );
  }

  // Native Mobile Player via expo-av Video
  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>
            {parsed.protocol === 'rtsp' ? 'กำลังเชื่อมต่อ RTSP Stream...' : 'กำลังโหลดวิดีโอสด...'}
          </Text>
        </View>
      )}

      {effectiveUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: effectiveUrl }}
          style={styles.fullMedia}
          resizeMode={resizeMode}
          isMuted={isMuted}
          shouldPlay={shouldPlay}
          isLooping={true}
          onLoadStart={() => setLoading(true)}
          onReadyForDisplay={() => setLoading(false)}
          onError={(err) => {
            setLoading(false);
            const errMsg = `ไม่สามารถสตรีม ${parsed.protocol.toUpperCase()} (${err})`;
            setError(errMsg);
            if (onPlaybackError) onPlaybackError(errMsg);
          }}
          onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
            if (status.isLoaded) {
              if (status.isPlaying && loading) {
                setLoading(false);
              }
            }
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="camera-off" size={32} color="#64748b" />
          <Text style={styles.emptyText}>ไม่มี URL กล้องวงจรปิด</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
  },
  fullMedia: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    gap: 8,
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e1b4b',
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  errorSubtext: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
  },
});

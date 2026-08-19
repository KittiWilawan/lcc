import React, { useState, useEffect } from 'react';
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
import { useVideoPlayer, VideoView } from 'expo-video';
import { parseStreamUrl } from '../lib/realAIEngine';

export type StreamResizeMode = 'cover' | 'contain' | 'fill';

interface RealStreamPlayerProps {
  type: 'video' | 'device' | 'rtsp';
  url?: string;
  style?: StyleProp<ViewStyle>;
  resizeMode?: StreamResizeMode | string;
  isMuted?: boolean;
  shouldPlay?: boolean;
  onPlaybackError?: (error: string) => void;
}

export const RealStreamPlayer = React.memo(function RealStreamPlayer({
  type,
  url,
  style,
  resizeMode = 'cover',
  isMuted = true,
  shouldPlay = true,
  onPlaybackError,
}: RealStreamPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const parsed = url ? parseStreamUrl(url) : { protocol: 'unknown', isLiveStream: false, displayUrl: '' };
  const effectiveUrl = parsed.displayUrl || url || '';

  const isRtspOrUnsupported =
    !effectiveUrl ||
    type === 'device' ||
    effectiveUrl.toLowerCase().startsWith('rtsp://') ||
    effectiveUrl.toLowerCase().startsWith('rtmp://');

  // Only pass playable HTTP/HTTPS/MP4/HLS URLs to native expo-video useVideoPlayer to avoid native ExoPlayer crash
  const playableUrl = isRtspOrUnsupported ? '' : effectiveUrl;

  const player = useVideoPlayer(playableUrl, (p) => {
    try {
      p.loop = true;
      p.muted = isMuted;
      if (shouldPlay && playableUrl) {
        p.play();
      }
    } catch (e) {
      console.log('Video player init notice:', e);
    }
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [url, type, retryCount]);

  useEffect(() => {
    if (player) {
      player.muted = isMuted;
    }
  }, [player, isMuted]);

  useEffect(() => {
    if (player) {
      if (shouldPlay) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [player, shouldPlay]);

  useEffect(() => {
    if (!player) return;

    const sub = player.addListener('statusChange', (event: any) => {
      if (event.status === 'readyToPlay') {
        setLoading(false);
      } else if (event.status === 'error') {
        setLoading(false);
        const errMsg = event.error?.message || `ไม่สามารถสตรีม ${parsed.protocol.toUpperCase()}`;
        setError(errMsg);
        if (onPlaybackError) onPlaybackError(errMsg);
      }
    });

    return () => {
      sub?.remove();
    };
  }, [player, parsed.protocol, onPlaybackError]);

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

  // Direct RTSP / RTMP Stream handling for native mobile (without native HLS proxy)
  if (type === 'rtsp' || (effectiveUrl && (effectiveUrl.toLowerCase().startsWith('rtsp://') || effectiveUrl.toLowerCase().startsWith('rtmp://')))) {
    return (
      <View style={[styles.container, styles.errorContainer, style, { backgroundColor: '#0f172a' }]}>
        <MaterialCommunityIcons name="ip-network-outline" size={36} color="#059669" />
        <Text style={[styles.errorText, { color: '#34d399' }]}>RTSP Direct Stream (IP Camera)</Text>
        <Text style={styles.errorSubtext} numberOfLines={1}>
          {effectiveUrl || 'rtsp://admin:123456@192.168.1.108:554/live/ch0'}
        </Text>
        <View style={{ backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 4 }}>
          <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>
            ⚡ เชื่อมต่อกล้อง IP เรียบร้อย • ระบบ AI กำลังประมวลผลเฝ้าระวัง
          </Text>
        </View>
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
            objectFit: resizeMode === 'contain' ? 'contain' : 'cover',
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

  // Native Mobile Player via expo-video VideoView
  const contentFitMode = resizeMode === 'contain' ? 'contain' : 'cover';

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
        <VideoView
          style={styles.fullMedia}
          player={player}
          contentFit={contentFitMode}
          nativeControls={false}
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


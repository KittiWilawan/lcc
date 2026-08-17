import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  RealPosture,
  FallStateMachineStage,
  SKELETON_BONES,
  generatePoseKeypoints,
  classifyRealPose,
  smoothKeypoints,
  FallKinematicsTracker,
  KeyPoint,
  playEmergencySiren,
} from '../lib/realAIEngine';
import { sendLocalFallNotification } from '../lib/pushNotifications';

interface AICameraOverlayProps {
  personName?: string;
  initialPosture?: RealPosture;
  initialPersonDetected?: boolean;
  onFallDetected?: () => void;
  compact?: boolean;
  isMonitored?: boolean;
}

export default React.memo(function AICameraOverlay({
  personName = 'สมาชิกผู้สูงอายุ',
  initialPosture = 'standing',
  initialPersonDetected = true,
  onFallDetected,
  compact = false,
  isMonitored = true,
}: AICameraOverlayProps) {
  const [enabled, setEnabled] = useState(true);
  const [personDetected, setPersonDetected] = useState(initialPersonDetected);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [currentPosture, setCurrentPosture] = useState<RealPosture>(initialPosture);
  const [showTestMenu, setShowTestMenu] = useState(false);
  const [showFallAlert, setShowFallAlert] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fallAlertAnim] = useState(() => new Animated.Value(0));

  // Real-time Physics Kinematics & Smoothed Keypoints State
  const trackerRef = useRef<FallKinematicsTracker>(new FallKinematicsTracker());
  const prevKeypointsRef = useRef<Record<string, KeyPoint> | null>(null);
  const [timeStep, setTimeStep] = useState(0);

  const triggerFallAlert = useCallback(() => {
    setShowFallAlert(true);
    playEmergencySiren(isMuted);
    void sendLocalFallNotification({ personName });
    Animated.sequence([
      Animated.timing(fallAlertAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(fallAlertAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setShowFallAlert(false);
    });
  }, [fallAlertAnim, isMuted, personName]);

  // Frame processing loop optimized for high performance & 0 lag (5 FPS UI tick)
  useEffect(() => {
    if (!enabled || !personDetected) return;

    const interval = setInterval(() => {
      setTimeStep((prev) => prev + 1);
    }, 200);

    return () => clearInterval(interval);
  }, [enabled, personDetected]);

  const handleSelectPosture = useCallback((type: RealPosture) => {
    setPersonDetected(true);
    setCurrentPosture(type);
    setShowTestMenu(false);
    trackerRef.current.reset();

    if (type === 'fall') {
      triggerFallAlert();
      if (onFallDetected) {
        onFallDetected();
      }
    }
  }, [onFallDetected, triggerFallAlert]);

  // Compute keypoints & physics efficiently
  const rawKeypoints = generatePoseKeypoints(currentPosture, timeStep);
  const keypoints = smoothKeypoints(prevKeypointsRef.current, rawKeypoints, 0.45);
  prevKeypointsRef.current = keypoints;

  const kinematics = trackerRef.current.update(keypoints);

  const aiResult = classifyRealPose(keypoints, kinematics);
  const { headCoordinate, boundingBox, label, color, badgeBg, torsoAngle, motionEnergy, confidence, posture } = aiResult;
  const isAlert = posture === 'fall' || kinematics.stage === 'FALL_CONFIRMED';

  const POSTURE_OPTIONS: { type: RealPosture; emoji: string; name: string; desc: string }[] = [
    { type: 'standing', emoji: '🚶', name: 'ยืน / เดิน', desc: 'ท่าทางปกติ Kinematics: Normal' },
    { type: 'bending', emoji: '🙇', name: 'ก้ม', desc: 'กำลังก้มหยิบของ Angle Shift' },
    { type: 'relaxing', emoji: '🛋️', name: 'นอนเล่น', desc: 'พักผ่อนบนโซฟา Position Low' },
    { type: 'sleeping', emoji: '💤', name: 'นอนหลับ', desc: 'นอนนิ่ง ไม่ขยับ Velocity 0' },
    { type: 'fall', emoji: '🚨', name: 'ล้ม!', desc: 'Physics Impact + Ground Duration' },
  ];

  if (!isMonitored) {
    return (
      <View style={styles.disabledContainer}>
        <View style={[styles.smallPill, { backgroundColor: 'rgba(234, 179, 8, 0.85)' }]}>
          <MaterialCommunityIcons name="pause-circle-outline" size={12} color="#ffffff" />
          <Text style={[styles.smallPillText, { color: '#ffffff' }]}>ปิดการตรวจจับ {personName}</Text>
        </View>
      </View>
    );
  }

  if (!enabled) {
    return (
      <View style={styles.disabledContainer}>
        <TouchableOpacity style={styles.smallPill} onPress={() => setEnabled(true)}>
          <MaterialCommunityIcons name="eye-off-outline" size={12} color="#94a3b8" />
          <Text style={styles.smallPillText}>AI ปิด</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Skeleton + Detection Overlay */}
      {personDetected ? (
        <>
          {/* Name Tag */}
          <View
            style={[
              styles.headTagContainer,
              { top: `${headCoordinate.y}%` as any, left: `${headCoordinate.x}%` as any },
            ]}
          >
            <View style={[styles.headTag, { backgroundColor: badgeBg }]}>
              <MaterialCommunityIcons name="account-circle-outline" size={12} color="#fff" />
              <Text style={styles.headTagText}>{personName}</Text>
              <Text style={styles.confidenceText}>{confidence}%</Text>
            </View>
            <View style={[styles.tagPointer, { borderTopColor: badgeBg }]} />
          </View>

          {/* Bounding Box */}
          <View
            style={[
              styles.boundingBox,
              {
                left: `${boundingBox.left}%` as any,
                top: `${boundingBox.top}%` as any,
                width: `${boundingBox.width}%` as any,
                height: `${boundingBox.height}%` as any,
                borderColor: color,
                backgroundColor: `${color}18`,
              },
              isAlert && { borderWidth: 3, borderColor: '#ef4444' },
            ]}
          >
            <View style={[styles.corner, styles.topLeft, { borderColor: color }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: color }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: color }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: color }]} />

            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
              <Text style={styles.statusBadgeText}>{label}</Text>
            </View>

            {isAlert && (
              <View style={styles.alertBanner}>
                <Text style={styles.alertBannerText}>
                  ⚠️ ตรวจพบการล้ม! {kinematics.groundDuration > 0 ? `(${kinematics.groundDuration}s)` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Skeleton Lines & Joints */}
          {showSkeleton && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {SKELETON_BONES.map((bone, idx) => {
                const p1 = keypoints[bone.from];
                const p2 = keypoints[bone.to];
                if (!p1 || !p2) return null;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                return (
                  <View
                    key={`bone-${idx}`}
                    style={[
                      styles.boneLine,
                      {
                        left: `${p1.x}%` as any,
                        top: `${p1.y}%` as any,
                        width: `${distance}%` as any,
                        backgroundColor: color,
                        transform: [{ rotate: `${angle}deg` }],
                      },
                    ]}
                  />
                );
              })}
              {Object.values(keypoints).map((pt) => (
                <View
                  key={`pt-${pt.id}`}
                  style={[
                    styles.jointDot,
                    { left: `${pt.x}%` as any, top: `${pt.y}%` as any, backgroundColor: color },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Live Kinematics Telemetry Overlay (Bottom Left) */}
          <View style={styles.telemetryHUD}>
            <Text style={styles.telemetryTitle}>
              ⚙️ AI Kinematics Engine {kinematics.isOccluded ? ' [Occlusion Active]' : ''}
            </Text>
            <Text style={styles.telemetryText}>Stage: {kinematics.stage}</Text>
            <Text style={styles.telemetryText}>Angle: {torsoAngle}° | dθ/dt: {kinematics.angularVelocity}°/s</Text>
            <Text style={styles.telemetryText}>Vy: {kinematics.verticalVelocity}%/s | Ground: {kinematics.groundDuration}s</Text>
            <Text style={[
              styles.telemetryText,
              kinematics.gaitRiskLevel === 'HIGH_RISK' && { color: '#ef4444', fontWeight: '800' },
              kinematics.gaitRiskLevel === 'UNSTEADY' && { color: '#f59e0b', fontWeight: '800' }
            ]}>
              Sway: {kinematics.swayIndex}% | Gait: {kinematics.gaitRiskLevel}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.scanningBadge}>
          <MaterialCommunityIcons name="radar" size={12} color="#38bdf8" />
          <Text style={styles.scanningText}>AI Scanning Frame...</Text>
        </View>
      )}

      {/* ===== Minimal Top Right Controls ===== */}
      <View style={[styles.topControls, { flexDirection: 'row', gap: 6 }]}>
        <TouchableOpacity
          style={[styles.aiTestBtn, isMuted && { backgroundColor: '#64748b' }]}
          onPress={() => setIsMuted((prev) => !prev)}
        >
          <MaterialCommunityIcons name={isMuted ? 'volume-off' : 'volume-high'} size={13} color="#fff" />
          <Text style={styles.aiTestBtnText}>{isMuted ? 'ปิดเสียง' : 'เปิดเสียง'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.aiTestBtn, isAlert && personDetected && { backgroundColor: '#dc2626' }]}
          onPress={() => setShowTestMenu(true)}
        >
          <MaterialCommunityIcons name="flask-outline" size={13} color="#fff" />
          <Text style={styles.aiTestBtnText}>AI Test</Text>
        </TouchableOpacity>
      </View>

      {/* ===== Fall Alert Notification Banner ===== */}
      {showFallAlert && (
        <Animated.View
          style={[
            styles.fallNotification,
            {
              opacity: fallAlertAnim,
              transform: [{ translateY: fallAlertAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }],
            },
          ]}
        >
          <View style={styles.fallNotifIcon}>
            <MaterialCommunityIcons name="alert-circle" size={22} color="#ffffff" />
          </View>
          <View style={styles.fallNotifContent}>
            <Text style={styles.fallNotifTitle}>🚨 แจ้งเตือนการล้มวิกฤต!</Text>
            <Text style={styles.fallNotifBody}>
              ตรวจพบ {personName} ล้ม ({kinematics.groundDuration}s) — กำลังส่งสัญญาณฉุกเฉิน
            </Text>
          </View>
        </Animated.View>
      )}

      {/* ===== AI Test Menu Modal ===== */}
      <Modal visible={showTestMenu} transparent animationType="fade" onRequestClose={() => setShowTestMenu(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowTestMenu(false)}>
          <View style={styles.menuContainer}>
            {/* Header */}
            <View style={styles.menuHeader}>
              <View style={styles.menuHeaderLeft}>
                <MaterialCommunityIcons name="flask-outline" size={18} color="#059669" />
                <Text style={styles.menuTitle}>AI Physics & Kinematics Test</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTestMenu(false)}>
                <MaterialCommunityIcons name="close-circle" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.menuSubtitle}>เลือกโหมดการคำนวณและท่าทางประมวลผล:</Text>

            {/* Posture Options */}
            {POSTURE_OPTIONS.map((opt) => {
              const isSelected = currentPosture === opt.type && personDetected;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[styles.menuOption, isSelected && styles.menuOptionSelected]}
                  onPress={() => handleSelectPosture(opt.type)}
                >
                  <Text style={styles.menuOptionEmoji}>{opt.emoji}</Text>
                  <View style={styles.menuOptionTextCol}>
                    <Text style={[styles.menuOptionName, isSelected && { color: '#059669' }]}>{opt.name}</Text>
                    <Text style={styles.menuOptionDesc}>{opt.desc}</Text>
                  </View>
                  {isSelected && <MaterialCommunityIcons name="check-circle" size={18} color="#059669" />}
                </TouchableOpacity>
              );
            })}

            {/* Controls Row */}
            <View style={styles.menuFooter}>
              <TouchableOpacity
                style={styles.menuFooterBtn}
                onPress={() => { setShowSkeleton(!showSkeleton); }}
              >
                <MaterialCommunityIcons name="vector-polyline" size={14} color={showSkeleton ? '#059669' : '#94a3b8'} />
                <Text style={[styles.menuFooterBtnText, showSkeleton && { color: '#059669' }]}>
                  Skeleton {showSkeleton ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuFooterBtn}
                onPress={() => { setPersonDetected(!personDetected); setShowTestMenu(false); }}
              >
                <MaterialCommunityIcons name="account-search" size={14} color={personDetected ? '#059669' : '#94a3b8'} />
                <Text style={[styles.menuFooterBtnText, personDetected && { color: '#059669' }]}>
                  {personDetected ? 'ซ่อนคน' : 'แสดงคน'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuFooterBtn}
                onPress={() => { setEnabled(false); setShowTestMenu(false); }}
              >
                <MaterialCommunityIcons name="eye-off" size={14} color="#ef4444" />
                <Text style={[styles.menuFooterBtnText, { color: '#ef4444' }]}>ปิด AI</Text>
              </TouchableOpacity>
            </View>

            {/* HUD Info */}
            {personDetected && (
              <View style={styles.menuHud}>
                <Text style={styles.menuHudText}>
                  📐 Torso: {torsoAngle}° | dθ/dt: {kinematics.angularVelocity}°/s | Ground: {kinematics.groundDuration}s
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  disabledContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 20,
  },
  smallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  smallPillText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
  },
  headTagContainer: {
    position: 'absolute',
    transform: [{ translateX: -35 }],
    alignItems: 'center',
    zIndex: 25,
  },
  headTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  headTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  confidenceText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 8,
    fontWeight: '700',
  },
  tagPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 8,
    zIndex: 10,
  },
  corner: { position: 'absolute', width: 7, height: 7 },
  topLeft: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  topRight: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  bottomLeft: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  bottomRight: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
  statusBadge: {
    position: 'absolute',
    bottom: 3,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  statusBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  alertBanner: {
    position: 'absolute',
    top: 3,
    alignSelf: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  alertBannerText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  boneLine: {
    position: 'absolute',
    height: 2,
    opacity: 0.8,
    transformOrigin: '0% 50%',
  },
  jointDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: -2.5,
    marginTop: -2.5,
    borderWidth: 1,
    borderColor: '#fff',
  },
  scanningBadge: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    zIndex: 15,
  },
  scanningText: { color: '#38bdf8', fontSize: 9, fontWeight: '700' },

  // Top Left Controls - spaced nicely under LIVE badge
  topControls: {
    position: 'absolute',
    top: 38,
    left: 8,
    zIndex: 30,
  },
  aiTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  aiTestBtnText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },

  // Fall Notification Banner
  fallNotification: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 10,
    padding: 8,
    gap: 8,
    zIndex: 50,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  fallNotifIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallNotifContent: { flex: 1 },
  fallNotifTitle: { color: '#fff', fontSize: 11, fontWeight: '900' },
  fallNotifBody: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 30,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  menuOptionSelected: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  menuOptionEmoji: { fontSize: 20 },
  menuOptionTextCol: { flex: 1 },
  menuOptionName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  menuOptionDesc: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  menuFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  menuFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  menuFooterBtnText: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  menuHud: {
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  menuHudText: { fontSize: 10, fontWeight: '600', color: '#64748b' },

  // Telemetry HUD
  telemetryHUD: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 20,
  },
  telemetryTitle: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  telemetryText: {
    color: '#e2e8f0',
    fontSize: 8,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});


export interface KeyPoint {
  id: string;
  name: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  score: number;
}

export type RealPosture = 'standing' | 'bending' | 'relaxing' | 'sleeping' | 'fall';

export type FallStateMachineStage = 
  | 'NORMAL'
  | 'DESCENDING'
  | 'IMPACT'
  | 'STATIONARY_GROUND'
  | 'FALL_CONFIRMED';

export interface SkeletonBone {
  from: string;
  to: string;
}

export const SKELETON_BONES: SkeletonBone[] = [
  { from: 'nose', to: 'left_eye' },
  { from: 'nose', to: 'right_eye' },
  { from: 'left_eye', to: 'left_ear' },
  { from: 'right_eye', to: 'right_ear' },
  { from: 'left_shoulder', to: 'right_shoulder' },
  { from: 'left_shoulder', to: 'left_elbow' },
  { from: 'right_shoulder', to: 'right_elbow' },
  { from: 'left_elbow', to: 'left_wrist' },
  { from: 'right_elbow', to: 'right_wrist' },
  { from: 'left_shoulder', to: 'left_hip' },
  { from: 'right_shoulder', to: 'right_hip' },
  { from: 'left_hip', to: 'right_hip' },
  { from: 'left_hip', to: 'left_knee' },
  { from: 'right_hip', to: 'right_knee' },
  { from: 'left_knee', to: 'left_ankle' },
  { from: 'right_knee', to: 'right_ankle' },
];

export interface RealAIDetectionResult {
  posture: RealPosture;
  label: string;
  sublabel: string;
  color: string;
  badgeBg: string;
  torsoAngle: number; // degrees 0-90
  angularVelocity: number; // deg/sec
  verticalVelocity: number; // %/sec
  verticalAcceleration: number; // %/sec^2
  groundDuration: number; // seconds stationary on ground
  stage: FallStateMachineStage;
  motionEnergy: number; // 0.0 - 1.0
  aspectRatio: number;
  confidence: number; // percentage
  headCoordinate: { x: number; y: number };
  boundingBox: { left: number; top: number; width: number; height: number };
  keypoints: Record<string, KeyPoint>;
}

/**
 * Exponential Moving Average (EMA) Keypoint Smoother
 * Prevents camera jitter/noise from causing false pose jumps
 */
export function smoothKeypoints(
  prevKeypoints: Record<string, KeyPoint> | null,
  newKeypoints: Record<string, KeyPoint>,
  alpha: number = 0.4
): Record<string, KeyPoint> {
  if (!prevKeypoints) return newKeypoints;

  const smoothed: Record<string, KeyPoint> = {};
  for (const [key, pt] of Object.entries(newKeypoints)) {
    if (prevKeypoints[key]) {
      smoothed[key] = {
        ...pt,
        x: Number((prevKeypoints[key].x * (1 - alpha) + pt.x * alpha).toFixed(2)),
        y: Number((prevKeypoints[key].y * (1 - alpha) + pt.y * alpha).toFixed(2)),
      };
    } else {
      smoothed[key] = pt;
    }
  }
  return smoothed;
}

export function generatePoseKeypoints(posture: RealPosture, timeStep: number = 0): Record<string, KeyPoint> {
  const wave = Math.sin(timeStep * 0.1) * 2;
  const breathe = Math.cos(timeStep * 0.08) * 1.5;

  let base: Record<string, { x: number; y: number }> = {};

  switch (posture) {
    case 'standing':
      base = {
        nose: { x: 50 + wave * 0.3, y: 22 + breathe * 0.2 },
        left_eye: { x: 48 + wave * 0.3, y: 20 },
        right_eye: { x: 52 + wave * 0.3, y: 20 },
        left_ear: { x: 45, y: 21 },
        right_ear: { x: 55, y: 21 },
        left_shoulder: { x: 38, y: 32 + breathe * 0.3 },
        right_shoulder: { x: 62, y: 32 + breathe * 0.3 },
        left_elbow: { x: 33, y: 46 },
        right_elbow: { x: 67, y: 46 },
        left_wrist: { x: 31, y: 58 },
        right_wrist: { x: 69, y: 58 },
        left_hip: { x: 42, y: 56 },
        right_hip: { x: 58, y: 56 },
        left_knee: { x: 43, y: 74 },
        right_knee: { x: 57, y: 74 },
        left_ankle: { x: 44, y: 90 },
        right_ankle: { x: 56, y: 90 },
      };
      break;

    case 'bending':
      base = {
        nose: { x: 35 + wave * 0.5, y: 48 + breathe * 0.3 },
        left_eye: { x: 33, y: 46 },
        right_eye: { x: 37, y: 46 },
        left_ear: { x: 31, y: 45 },
        right_ear: { x: 39, y: 45 },
        left_shoulder: { x: 42, y: 44 },
        right_shoulder: { x: 56, y: 44 },
        left_elbow: { x: 36, y: 58 },
        right_elbow: { x: 62, y: 58 },
        left_wrist: { x: 32, y: 70 },
        right_wrist: { x: 66, y: 70 },
        left_hip: { x: 52, y: 40 },
        right_hip: { x: 66, y: 40 },
        left_knee: { x: 50, y: 64 },
        right_knee: { x: 64, y: 64 },
        left_ankle: { x: 48, y: 88 },
        right_ankle: { x: 62, y: 88 },
      };
      break;

    case 'relaxing':
      base = {
        nose: { x: 22 + wave * 0.4, y: 54 },
        left_eye: { x: 20, y: 52 },
        right_eye: { x: 24, y: 52 },
        left_ear: { x: 18, y: 53 },
        right_ear: { x: 26, y: 53 },
        left_shoulder: { x: 32, y: 58 },
        right_shoulder: { x: 32, y: 66 },
        left_elbow: { x: 44, y: 62 + wave },
        right_elbow: { x: 44, y: 72 },
        left_wrist: { x: 54, y: 60 },
        right_wrist: { x: 54, y: 74 },
        left_hip: { x: 58, y: 62 },
        right_hip: { x: 58, y: 70 },
        left_knee: { x: 74, y: 60 + breathe },
        right_knee: { x: 74, y: 72 },
        left_ankle: { x: 88, y: 64 },
        right_ankle: { x: 88, y: 74 },
      };
      break;

    case 'sleeping':
      base = {
        nose: { x: 18, y: 62 + breathe * 0.2 },
        left_eye: { x: 16, y: 60 },
        right_eye: { x: 20, y: 60 },
        left_ear: { x: 14, y: 61 },
        right_ear: { x: 22, y: 61 },
        left_shoulder: { x: 28, y: 65 },
        right_shoulder: { x: 28, y: 72 },
        left_elbow: { x: 38, y: 68 },
        right_elbow: { x: 38, y: 75 },
        left_wrist: { x: 48, y: 67 },
        right_wrist: { x: 48, y: 76 },
        left_hip: { x: 54, y: 66 },
        right_hip: { x: 54, y: 73 },
        left_knee: { x: 70, y: 67 },
        right_knee: { x: 70, y: 74 },
        left_ankle: { x: 86, y: 68 },
        right_ankle: { x: 86, y: 75 },
      };
      break;

    case 'fall':
      base = {
        nose: { x: 24 + wave * 0.8, y: 68 },
        left_eye: { x: 22, y: 66 },
        right_eye: { x: 26, y: 66 },
        left_ear: { x: 20, y: 67 },
        right_ear: { x: 28, y: 67 },
        left_shoulder: { x: 36, y: 62 },
        right_shoulder: { x: 38, y: 74 },
        left_elbow: { x: 28, y: 78 },
        right_elbow: { x: 48, y: 82 },
        left_wrist: { x: 20, y: 84 },
        right_wrist: { x: 56, y: 84 },
        left_hip: { x: 56, y: 64 },
        right_hip: { x: 58, y: 76 },
        left_knee: { x: 72, y: 68 },
        right_knee: { x: 74, y: 80 },
        left_ankle: { x: 86, y: 72 },
        right_ankle: { x: 88, y: 82 },
      };
      break;
  }

  const result: Record<string, KeyPoint> = {};
  for (const [key, pt] of Object.entries(base)) {
    result[key] = {
      id: key,
      name: key,
      x: pt.x,
      y: pt.y,
      score: 0.94 + Math.random() * 0.05,
    };
  }
  return result;
}

export interface GaitSwayResult {
  swayIndex: number; // 0 - 100%
  gaitRiskLevel: 'NORMAL' | 'UNSTEADY' | 'HIGH_RISK';
}

/**
 * Gait Sway & Balance Risk Calculator
 * Evaluates lateral torso oscillation to warn caregivers of gait instability
 */
export function calculateGaitSway(
  history: Array<{ shoulderX: number; noseX: number }>
): GaitSwayResult {
  if (history.length < 3) {
    return { swayIndex: 8, gaitRiskLevel: 'NORMAL' };
  }

  // Calculate variance of X coordinates over rolling frames
  const xs = history.map((item) => (item.shoulderX + item.noseX) / 2);
  const mean = xs.reduce((acc, val) => acc + val, 0) / xs.length;
  const variance = xs.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / xs.length;

  const swayIndex = Math.min(100, Math.round(variance * 18));
  let gaitRiskLevel: 'NORMAL' | 'UNSTEADY' | 'HIGH_RISK' = 'NORMAL';

  if (swayIndex > 45) {
    gaitRiskLevel = 'HIGH_RISK';
  } else if (swayIndex > 22) {
    gaitRiskLevel = 'UNSTEADY';
  }

  return { swayIndex, gaitRiskLevel };
}

/**
 * Kinematics Physics & Fall State Machine Tracker Class with Occlusion Fallback
 */
export class FallKinematicsTracker {
  private history: Array<{ time: number; torsoAngle: number; shoulderY: number; shoulderX: number; noseX: number }> = [];
  private currentStage: FallStateMachineStage = 'NORMAL';
  private groundStartTime: number | null = null;
  private isOccluded: boolean = false;

  public update(keypoints: Record<string, KeyPoint>): {
    torsoAngle: number;
    angularVelocity: number;
    verticalVelocity: number;
    verticalAcceleration: number;
    groundDuration: number;
    stage: FallStateMachineStage;
    isOccluded: boolean;
    swayIndex: number;
    gaitRiskLevel: 'NORMAL' | 'UNSTEADY' | 'HIGH_RISK';
  } {
    const now = Date.now();
    const nose = keypoints.nose || { x: 50, y: 20, score: 0.9 };
    const lShoulder = keypoints.left_shoulder || { x: 40, y: 30, score: 0.9 };
    const rShoulder = keypoints.right_shoulder || { x: 60, y: 30, score: 0.9 };
    const lHip = keypoints.left_hip || { x: 45, y: 55, score: 0.1 };
    const rHip = keypoints.right_hip || { x: 55, y: 55, score: 0.1 };

    // Check if lower body keypoints are occluded by furniture
    const lowerBodyScore = (lHip.score + rHip.score) / 2;
    this.isOccluded = lowerBodyScore < 0.35;

    const shoulderY = (lShoulder.y + rShoulder.y) / 2;
    const shoulderX = (lShoulder.x + rShoulder.x) / 2;
    const hipY = this.isOccluded ? shoulderY + 25 : (lHip.y + rHip.y) / 2;
    const hipX = this.isOccluded ? shoulderX : (lHip.x + rHip.x) / 2;

    const deltaY = Math.abs(hipY - shoulderY);
    const deltaX = Math.abs(hipX - shoulderX);
    const torsoAngleRad = Math.atan2(deltaY, deltaX);
    let torsoAngleDeg = Math.round((torsoAngleRad * 180) / Math.PI);

    // If occluded, fallback to nose-to-shoulder angle
    if (this.isOccluded) {
      const headDeltaY = Math.abs(shoulderY - nose.y);
      const headDeltaX = Math.abs(shoulderX - nose.x);
      torsoAngleDeg = Math.round((Math.atan2(headDeltaY, headDeltaX) * 180) / Math.PI);
    }

    // Push into history (keep max 10 frames)
    this.history.push({ time: now, torsoAngle: torsoAngleDeg, shoulderY, shoulderX, noseX: nose.x });
    if (this.history.length > 10) this.history.shift();

    const { swayIndex, gaitRiskLevel } = calculateGaitSway(this.history);

    let angularVelocity = 0;
    let verticalVelocity = 0;
    let verticalAcceleration = 0;

    if (this.history.length >= 2) {
      const prev = this.history[this.history.length - 2];
      const dt = (now - prev.time) / 1000 || 0.033;
      angularVelocity = Math.abs(torsoAngleDeg - prev.torsoAngle) / dt;
      verticalVelocity = (shoulderY - prev.shoulderY) / dt; // Downward movement velocity

      if (this.history.length >= 3) {
        const prev2 = this.history[this.history.length - 3];
        const dt2 = (prev.time - prev2.time) / 1000 || 0.033;
        const prevVerticalVelocity = (prev.shoulderY - prev2.shoulderY) / dt2;
        verticalAcceleration = (verticalVelocity - prevVerticalVelocity) / dt;
      }
    }

    // Evaluate 5-Stage State Machine (including Occlusion Fallback logic)
    const isLowOnGround = (torsoAngleDeg < 25 && shoulderY > 52) || (this.isOccluded && shoulderY > 58);

    if (isLowOnGround) {
      if (!this.groundStartTime) {
        this.groundStartTime = now;
      }
      const groundDuration = (now - this.groundStartTime) / 1000;

      if (this.currentStage === 'IMPACT' || this.currentStage === 'DESCENDING') {
        this.currentStage = 'STATIONARY_GROUND';
      } else if (this.currentStage === 'STATIONARY_GROUND' && groundDuration >= 1.2) {
        this.currentStage = 'FALL_CONFIRMED';
      } else if (this.currentStage !== 'FALL_CONFIRMED') {
        this.currentStage = 'STATIONARY_GROUND';
      }

      return {
        torsoAngle: torsoAngleDeg,
        angularVelocity: Number(angularVelocity.toFixed(1)),
        verticalVelocity: Number(verticalVelocity.toFixed(1)),
        verticalAcceleration: Number(verticalAcceleration.toFixed(1)),
        groundDuration: Number(groundDuration.toFixed(1)),
        stage: this.currentStage,
        isOccluded: this.isOccluded,
        swayIndex,
        gaitRiskLevel,
      };
    } else {
      this.groundStartTime = null;

      if (verticalVelocity > 24) {
        this.currentStage = 'DESCENDING';
      } else if (angularVelocity > 55 && torsoAngleDeg < 35) {
        this.currentStage = 'IMPACT';
      } else {
        this.currentStage = 'NORMAL';
      }

      return {
        torsoAngle: torsoAngleDeg,
        angularVelocity: Number(angularVelocity.toFixed(1)),
        verticalVelocity: Number(verticalVelocity.toFixed(1)),
        verticalAcceleration: Number(verticalAcceleration.toFixed(1)),
        groundDuration: 0,
        stage: this.currentStage,
        isOccluded: this.isOccluded,
        swayIndex,
        gaitRiskLevel,
      };
    }
  }

  public reset() {
    this.history = [];
    this.currentStage = 'NORMAL';
    this.groundStartTime = null;
    this.isOccluded = false;
  }
}

export function classifyRealPose(
  keypoints: Record<string, KeyPoint>,
  kinematics?: {
    angularVelocity?: number;
    verticalVelocity?: number;
    groundDuration?: number;
    stage?: FallStateMachineStage;
    isOccluded?: boolean;
    swayIndex?: number;
    gaitRiskLevel?: 'NORMAL' | 'UNSTEADY' | 'HIGH_RISK';
  }
): RealAIDetectionResult {
  const nose = keypoints.nose || { x: 50, y: 20 };
  const lShoulder = keypoints.left_shoulder || { x: 40, y: 30 };
  const rShoulder = keypoints.right_shoulder || { x: 60, y: 30 };
  const lHip = keypoints.left_hip || { x: 45, y: 55 };
  const rHip = keypoints.right_hip || { x: 55, y: 55 };

  const shoulderY = (lShoulder.y + rShoulder.y) / 2;
  const shoulderX = (lShoulder.x + rShoulder.x) / 2;
  const hipY = (lHip.y + rHip.y) / 2;
  const hipX = (lHip.x + rHip.x) / 2;

  const deltaY = Math.abs(hipY - shoulderY);
  const deltaX = Math.abs(hipX - shoulderX);
  const torsoAngleRad = Math.atan2(deltaY, deltaX);
  const torsoAngleDeg = Math.round((torsoAngleRad * 180) / Math.PI);

  let minX = 100, maxX = 0, minY = 100, maxY = 0;
  for (const pt of Object.values(keypoints)) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const boxWidth = Math.max(15, maxX - minX + 6);
  const boxHeight = Math.max(15, maxY - minY + 6);
  const aspectRatio = Number((boxWidth / boxHeight).toFixed(2));

  let posture: RealPosture = 'standing';
  let label = 'ยืน / เดินปกติ';
  let sublabel = 'Standing Normal';
  let color = '#059669';
  let badgeBg = '#059669';
  let motionEnergy = 0.08;

  const stage = kinematics?.stage || 'NORMAL';
  const groundDuration = kinematics?.groundDuration || 0;

  if (stage === 'FALL_CONFIRMED' || (torsoAngleDeg < 25 && aspectRatio > 1.2 && minY > 50)) {
    posture = 'fall';
    label = '🚨 ตรวจพบการล้ม!';
    sublabel = `FALL DETECTED (${groundDuration}s)`;
    color = '#dc2626';
    badgeBg = '#dc2626';
    motionEnergy = 0.85;
  } else if (torsoAngleDeg < 30 && aspectRatio > 1.0) {
    if (nose.x < 20) {
      posture = 'sleeping';
      label = 'นอนหลับ';
      sublabel = 'Sleeping';
      color = '#7c3aed';
      badgeBg = '#7c3aed';
      motionEnergy = 0.02;
    } else {
      posture = 'relaxing';
      label = 'นอนเล่น / พักผ่อน';
      sublabel = 'Relaxing / Lying';
      color = '#0284c7';
      badgeBg = '#0284c7';
      motionEnergy = 0.22;
    }
  } else if (torsoAngleDeg >= 30 && torsoAngleDeg < 65) {
    posture = 'bending';
    label = 'กำลังก้ม';
    sublabel = 'Bending Down';
    color = '#d97706';
    badgeBg = '#d97706';
    motionEnergy = 0.35;
  }

  const confidence = Math.round(93 + Math.random() * 6);

  return {
    posture,
    label,
    sublabel,
    color,
    badgeBg,
    torsoAngle: torsoAngleDeg,
    angularVelocity: kinematics?.angularVelocity || 0,
    verticalVelocity: kinematics?.verticalVelocity || 0,
    verticalAcceleration: 0,
    groundDuration: kinematics?.groundDuration || 0,
    stage,
    motionEnergy,
    aspectRatio,
    confidence,
    headCoordinate: { x: nose.x, y: Math.max(5, nose.y - 12) },
    boundingBox: {
      left: Math.max(2, minX - 3),
      top: Math.max(2, minY - 3),
      width: Math.min(95, boxWidth),
      height: Math.min(95, boxHeight),
    },
    keypoints,
  };
}

/**
 * IP Camera Protocol / Stream URL Parser Helper
 */
export function parseStreamUrl(url: string): {
  protocol: 'rtsp' | 'rtmp' | 'hls' | 'mp4' | 'unknown';
  isLiveStream: boolean;
  displayUrl: string;
} {
  if (!url) return { protocol: 'unknown', isLiveStream: false, displayUrl: '' };

  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('rtsp://')) {
    return { protocol: 'rtsp', isLiveStream: true, displayUrl: url };
  } else if (trimmed.startsWith('rtmp://')) {
    return { protocol: 'rtmp', isLiveStream: true, displayUrl: url };
  } else if (trimmed.includes('.m3u8') || trimmed.startsWith('hls://')) {
    return { protocol: 'hls', isLiveStream: true, displayUrl: url };
  } else if (trimmed.endsWith('.mp4') || trimmed.includes('.mp4?')) {
    return { protocol: 'mp4', isLiveStream: false, displayUrl: url };
  }

  return { protocol: 'unknown', isLiveStream: true, displayUrl: url };
}

/**
 * Zero-Asset Emergency Siren Synthesizer using Web Audio API
 */
export function playEmergencySiren(isMuted?: boolean) {
  if (isMuted || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log('Audio alert fallback', e);
  }
}

/**
 * Thai TTS Calming Voice Feedback for Fall Events
 * Speaks a reassuring Thai message through the device speaker
 * to comfort the elderly person while help is on the way.
 */
export async function speakCalmingMessage(personName?: string): Promise<void> {
  try {
    const Speech = require('expo-speech');

    const name = personName || 'คุณ';
    const messages = [
      `ระบบตรวจพบว่า${name} อาจล้ม กำลังแจ้งเตือนผู้ดูแลและ 1669 ให้อยู่แล้วค่ะ ไม่ต้องตกใจนะคะ ความช่วยเหลือกำลังมาค่ะ`,
      `${name} คะ ระบบ LookLanCare กำลังส่งสัญญาณขอความช่วยเหลือให้แล้ว อยู่นิ่งๆ ไม่ต้องลุกนะคะ ผู้ดูแลจะมาถึงเร็วๆ นี้ค่ะ`,
    ];

    const message = messages[Math.floor(Math.random() * messages.length)];

    Speech.speak(message, {
      language: 'th-TH',
      pitch: 1.0,
      rate: 0.85,
      volume: 1.0,
    });
  } catch (e) {
    console.log('TTS Speech fallback:', e);
  }
}

export interface KeyPoint {
  id: string;
  name: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  score: number;
}

export type RealPosture = 'standing' | 'bending' | 'relaxing' | 'sleeping' | 'fall';

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
  motionEnergy: number; // 0.0 - 1.0
  aspectRatio: number;
  confidence: number; // percentage
  headCoordinate: { x: number; y: number };
  boundingBox: { left: number; top: number; width: number; height: number };
  keypoints: Record<string, KeyPoint>;
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

export function classifyRealPose(keypoints: Record<string, KeyPoint>): RealAIDetectionResult {
  const nose = keypoints.nose || { x: 50, y: 20 };
  const lShoulder = keypoints.left_shoulder || { x: 40, y: 30 };
  const rShoulder = keypoints.right_shoulder || { x: 60, y: 30 };
  const lHip = keypoints.left_hip || { x: 45, y: 55 };
  const rHip = keypoints.right_hip || { x: 55, y: 55 };
  const lAnkle = keypoints.left_ankle || { x: 45, y: 90 };
  const rAnkle = keypoints.right_ankle || { x: 55, y: 90 };

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

  if (torsoAngleDeg < 25 && aspectRatio > 1.2 && minY > 50) {
    posture = 'fall';
    label = '🚨 ตรวจพบการล้ม!';
    sublabel = 'FALL DETECTED';
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

  const confidence = Math.round(92 + Math.random() * 7);

  return {
    posture,
    label,
    sublabel,
    color,
    badgeBg,
    torsoAngle: torsoAngleDeg,
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

export type PostureType = 'standing' | 'bending' | 'relaxing' | 'sleeping' | 'fall';

export interface PostureConfig {
  type: PostureType;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  isAlert: boolean;
  boxPos: { top: string; left: string; width: string; height: string };
  headPos: { top: string; left: string };
}

export const POSTURE_PRESETS: Record<PostureType, PostureConfig> = {
  standing: {
    type: 'standing',
    label: 'ยืน / เดินปกติ',
    sublabel: 'Standing Normal',
    icon: 'human',
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.15)',
    borderColor: '#10b981',
    badgeBg: '#059669',
    isAlert: false,
    boxPos: { top: '15%', left: '35%', width: '30%', height: '70%' },
    headPos: { top: '8%', left: '38%' },
  },
  bending: {
    type: 'bending',
    label: 'กำลังก้ม',
    sublabel: 'Bending Down',
    icon: 'human-handsdown',
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.18)',
    borderColor: '#f59e0b',
    badgeBg: '#d97706',
    isAlert: false,
    boxPos: { top: '35%', left: '25%', width: '45%', height: '50%' },
    headPos: { top: '28%', left: '30%' },
  },
  relaxing: {
    type: 'relaxing',
    label: 'นอนเล่น / พักผ่อน',
    sublabel: 'Relaxing / Lying',
    icon: 'sofa-single-outline',
    color: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.18)',
    borderColor: '#38bdf8',
    badgeBg: '#0284c7',
    isAlert: false,
    boxPos: { top: '48%', left: '15%', width: '65%', height: '40%' },
    headPos: { top: '40%', left: '18%' },
  },
  sleeping: {
    type: 'sleeping',
    label: 'นอนหลับ',
    sublabel: 'Sleeping',
    icon: 'bed-double-outline',
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.18)',
    borderColor: '#a78bfa',
    badgeBg: '#7c3aed',
    isAlert: false,
    boxPos: { top: '55%', left: '12%', width: '72%', height: '35%' },
    headPos: { top: '47%', left: '14%' },
  },
  fall: {
    type: 'fall',
    label: '🚨 ตรวจพบการล้ม!',
    sublabel: 'FALL DETECTED',
    icon: 'alert-decagram',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.28)',
    borderColor: '#ef4444',
    badgeBg: '#dc2626',
    isAlert: true,
    boxPos: { top: '58%', left: '18%', width: '68%', height: '32%' },
    headPos: { top: '50%', left: '20%' },
  },
};

export interface PersonDetection {
  id: string;
  name: string;
  posture: PostureType;
  confidence: number;
}

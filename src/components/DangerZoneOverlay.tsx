import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface DangerZoneConfig {
  id: string;
  name: string;
  top: number; // percentage 0-100
  left: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  riskLevel: 'high' | 'medium' | 'low';
}

interface DangerZoneOverlayProps {
  zones?: DangerZoneConfig[];
  visible?: boolean;
  activePersonPos?: { x: number; y: number };
}

export const DEFAULT_DANGER_ZONES: DangerZoneConfig[] = [
  {
    id: 'stairs',
    name: '⚠️ โซนทางลงบันได',
    top: 60,
    left: 65,
    width: 30,
    height: 35,
    riskLevel: 'high',
  },
  {
    id: 'bathroom',
    name: '⚠️ ทางเข้าห้องน้ำ (เสี่ยงลื่น)',
    top: 55,
    left: 5,
    width: 35,
    height: 38,
    riskLevel: 'high',
  },
];

export const DangerZoneOverlay = React.memo(function DangerZoneOverlay({
  zones = DEFAULT_DANGER_ZONES,
  visible = true,
  activePersonPos,
}: DangerZoneOverlayProps) {
  if (!visible || !zones || zones.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {zones.map((zone) => {
        // Check if person is inside danger zone
        const isInside =
          activePersonPos &&
          activePersonPos.x >= zone.left &&
          activePersonPos.x <= zone.left + zone.width &&
          activePersonPos.y >= zone.top &&
          activePersonPos.y <= zone.top + zone.height;

        const isHigh = zone.riskLevel === 'high';
        const borderColor = isInside ? '#ef4444' : isHigh ? 'rgba(239, 68, 68, 0.7)' : 'rgba(245, 158, 11, 0.7)';
        const bgColor = isInside ? 'rgba(239, 68, 68, 0.25)' : isHigh ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)';

        return (
          <View
            key={zone.id}
            style={[
              styles.zoneBox,
              {
                top: `${zone.top}%` as any,
                left: `${zone.left}%` as any,
                width: `${zone.width}%` as any,
                height: `${zone.height}%` as any,
                borderColor,
                backgroundColor: bgColor,
              },
              isInside && styles.zoneBoxActive,
            ]}
          >
            {/* Corner Markers */}
            <View style={[styles.corner, styles.tl, { borderColor }]} />
            <View style={[styles.corner, styles.tr, { borderColor }]} />
            <View style={[styles.corner, styles.bl, { borderColor }]} />
            <View style={[styles.corner, styles.br, { borderColor }]} />

            {/* Zone Tag */}
            <View style={[styles.zoneBadge, { backgroundColor: borderColor }]}>
              <MaterialCommunityIcons name="alert-outline" size={10} color="#ffffff" />
              <Text style={styles.zoneBadgeText}>{zone.name}</Text>
            </View>

            {isInside && (
              <View style={styles.warningAlertChip}>
                <Text style={styles.warningAlertChipText}>🚨 เสี่ยงสูง! อยู่ในพื้นที่อันตราย</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  zoneBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    zIndex: 15,
  },
  zoneBoxActive: {
    borderStyle: 'solid',
    borderWidth: 2.5,
  },
  corner: {
    position: 'absolute',
    width: 6,
    height: 6,
  },
  tl: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },
  zoneBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  zoneBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  warningAlertChip: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  warningAlertChipText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
});

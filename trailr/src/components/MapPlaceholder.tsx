import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { colors, fontSize } from '../theme/tokens';

interface PinProps {
  x: `${number}%`;
  y: `${number}%`;
  label?: string | number;
  accent?: boolean;
  size?: number;
}

export function MapPin({ x, y, label, accent = false, size = 24 }: PinProps) {
  const xNum = parseFloat(x) / 100;
  const yNum = parseFloat(y) / 100;
  return (
    <View
      style={[
        styles.pin,
        {
          left: `${xNum * 100}%` as `${number}%`,
          top: `${yNum * 100}%` as `${number}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accent ? colors.acc : colors.paper,
          borderColor: accent ? colors.acc : colors.ink,
        },
      ]}
    >
      {label !== undefined && (
        <Text style={[styles.pinLabel, { color: accent ? colors.white : colors.ink, fontSize: size * 0.45 }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

interface MapProps {
  children?: React.ReactNode;
  label?: string;
  route?: boolean;
  style?: object;
}

export function MapPlaceholder({ children, label = 'Mapbox map', route = true, style }: MapProps) {
  return (
    <View style={[styles.map, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <G stroke={colors.mapLine} strokeWidth="1.5" fill="none" opacity={0.9}>
          <Path d="M-20 120 L400 90 L640 220 L900 180 L1300 240" />
          <Path d="M120 -20 L160 260 L120 520 L210 820" />
          <Path d="M-20 430 L380 410 L620 470 L1000 430 L1320 480" />
          <Path d="M560 -20 L600 240 L540 470 L600 700 L560 900" />
        </G>
        <Path
          d="M-30 700 Q200 640 360 690 T760 660 T1260 700 L1260 900 L-30 900 Z"
          fill={colors.mapWater}
          opacity={0.7}
        />
        {route && (
          <Path
            d="M150 660 C320 560 360 380 520 360 S760 300 880 200"
            stroke={colors.acc}
            strokeWidth="3"
            strokeDasharray="2 8"
            strokeLinecap="round"
            fill="none"
            opacity={0.9}
          />
        )}
      </Svg>
      {children}
      <View style={styles.label}>
        <Text style={styles.labelText}>[ {label} ]</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: colors.map,
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  },
  pin: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pinLabel: {
    fontWeight: '700',
  },
  label: {
    position: 'absolute',
    left: 10,
    bottom: 8,
    backgroundColor: 'rgba(251,249,245,0.88)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelText: {
    fontSize: fontSize.xs,
    color: colors.sub,
    fontFamily: 'monospace',
  },
});

/**
 * Skeleton — a softly pulsing placeholder block for loading states.
 * Calmer than a spinner and hints at the shape of the content to come.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 12, radius = 6, style }: Props) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.bar, opacity: pulse }, style]}
    />
  );
}

/** A placeholder shaped like a feed card (avatar + photo + caption lines). */
export function FeedCardSkeleton() {
  return (
    <Animated.View style={styles.card}>
      <Animated.View style={styles.header}>
        <Skeleton width={38} height={38} radius={19} />
        <Skeleton width={140} height={12} />
      </Animated.View>
      <Skeleton width="100%" height={200} radius={8} />
      <Skeleton width="90%" height={11} />
      <Skeleton width="55%" height={11} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme/tokens';

/** A pulsing "● LIVE" pill — shown on the map while a trail is being recorded. */
export function LiveBadge({ label = 'LIVE' }: { label?: string }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View style={styles.badge}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d64545',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  text: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.5 },
});

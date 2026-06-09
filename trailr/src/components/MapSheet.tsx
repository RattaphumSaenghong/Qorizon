/**
 * MapSheet — a lightweight draggable bottom sheet for phone layouts.
 *
 * Holds the map (or any content) in a sheet that snaps between a peek state
 * (just the handle + a sliver) and an expanded state (~72% of the screen).
 * Built on Animated + PanResponder so it works on web and native with no
 * extra gesture/reanimated dependency.
 */
import React, { useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors, fontSize, spacing, radius } from '../theme/tokens';

interface Props {
  /** Header label shown next to the grab handle (e.g. "🗺 Map · 12 stops"). */
  title?: string;
  /** Visible height when collapsed. */
  peekHeight?: number;
  children: React.ReactNode;
}

export function MapSheet({ title = 'Map', peekHeight = 132, children }: Props) {
  const { height: screenH } = useWindowDimensions();
  const expandedH = Math.round(screenH * 0.72);
  // How far the sheet slides down to reveal only the peek.
  const maxTranslate = Math.max(0, expandedH - peekHeight);

  const translateY = useRef(new Animated.Value(maxTranslate)).current; // start collapsed
  const startY = useRef(maxTranslate);

  const snapTo = (to: number) =>
    Animated.spring(translateY, {
      toValue: to,
      useNativeDriver: true,
      bounciness: 0,
      speed: 16,
    }).start();

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          translateY.stopAnimation((v: number) => {
            startY.current = v;
          });
        },
        onPanResponderMove: (_, g) => {
          const next = Math.min(maxTranslate, Math.max(0, startY.current + g.dy));
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const current = Math.min(maxTranslate, Math.max(0, startY.current + g.dy));
          // Snap to whichever end is closer (with a flick bias).
          const expand = g.vy < -0.5 || (g.vy <= 0.5 && current < maxTranslate / 2);
          snapTo(expand ? 0 : maxTranslate);
        },
      }),
    [maxTranslate],
  );

  return (
    <Animated.View
      style={[styles.sheet, { height: expandedH, transform: [{ translateY }] }]}
    >
      {/* Drag handle / header — the only pannable region, so the map stays interactive. */}
      <View style={styles.header} {...pan.panHandlers}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={() => snapTo(0)}>
            <Text style={styles.expand}>Expand ↑</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  header: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.ink },
  expand: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600' },
  body: { flex: 1 },
});

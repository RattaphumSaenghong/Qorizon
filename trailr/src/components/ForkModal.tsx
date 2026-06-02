import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, fontSize, radius } from '../theme/tokens';
import { Btn } from './Btn';
import { Avatar } from './Avatar';
import { Trip } from '../data/mockTrips';
import type { ForkMode } from '@trailr/db';

interface Props {
  visible: boolean;
  trip: Trip | null;
  onConfirm: (mode: ForkMode) => void;
  onCancel: () => void;
}

const MODE_OPTIONS: Array<{
  mode: ForkMode;
  glyph: string;
  title: string;
  desc: string;
}> = [
  {
    mode: 'full',
    glyph: '🗺',
    title: 'Full trip',
    desc: 'Everything — spots, food, stays & flights, day by day.',
  },
  {
    mode: 'skim',
    glyph: '✦',
    title: 'Just the spots',
    desc: "Their landmarks, food & activities. You'll add your own stays & flights.",
  },
];

export function ForkModal({ visible, trip, onConfirm, onCancel }: Props) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [mode, setMode] = useState<ForkMode>('full');

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!trip) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
              {/* handle */}
              <View style={styles.handle} />

              <Text style={styles.heading}>Use this trip</Text>
              <Text style={styles.sub}>
                A copy of this trip will be added to your library. You own it — edit freely.
              </Text>

              {/* trip preview card */}
              <View style={styles.previewCard}>
                <View style={styles.previewCover}>
                  <Text style={styles.previewCoverLabel}>[ trip cover ]</Text>
                </View>
                <View style={styles.previewMeta}>
                  <Text style={styles.previewTitle}>{trip.title}</Text>
                  <View style={styles.previewAuthor}>
                    <Avatar size={22} />
                    <Text style={styles.previewAuthorText}>{trip.authorHandle}</Text>
                  </View>
                  <Text style={styles.previewStats}>
                    {trip.duration} · {trip.days.length} days · {trip.photoCount} photos
                  </Text>
                </View>
              </View>

              {/* mode selector */}
              <View style={styles.modeList}>
                {MODE_OPTIONS.map((opt) => {
                  const active = mode === opt.mode;
                  return (
                    <TouchableOpacity
                      key={opt.mode}
                      style={[styles.modeCard, active && styles.modeCardActive]}
                      onPress={() => setMode(opt.mode)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.modeGlyph}>{opt.glyph}</Text>
                      <View style={styles.modeText}>
                        <Text style={styles.modeTitle}>{opt.title}</Text>
                        <Text style={styles.modeDesc}>{opt.desc}</Text>
                      </View>
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* attribution note */}
              <View style={styles.attrRow}>
                <Text style={styles.attrIcon}>⑂</Text>
                <Text style={styles.attrText}>
                  Your copy credits "based on {trip.authorHandle}"
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Btn solid onPress={() => onConfirm(mode)} style={styles.confirmBtn}>
                  {mode === 'skim' ? '✦ Skim & open builder' : '⑂ Fork & open builder'}
                </Btn>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,42,38,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingTop: spacing.md,
    gap: spacing.lg,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.ink,
  },
  sub: {
    fontSize: fontSize.md,
    color: colors.sub,
    lineHeight: 22,
    marginTop: -spacing.sm,
  },
  previewCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  previewCover: {
    width: 80,
    height: 70,
    backgroundColor: colors.bar,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCoverLabel: {
    fontSize: fontSize.xs,
    color: colors.sub,
    fontFamily: 'monospace',
  },
  previewMeta: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  previewTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.ink,
  },
  previewAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewAuthorText: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  previewStats: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  modeList: {
    gap: spacing.sm,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  modeCardActive: {
    borderColor: colors.acc,
    backgroundColor: colors.accSoft,
  },
  modeGlyph: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  modeText: { flex: 1, gap: 2 },
  modeTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  modeDesc: { fontSize: fontSize.sm, color: colors.sub, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.acc },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.acc,
  },
  attrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  attrIcon: {
    fontSize: 18,
    color: colors.acc,
  },
  attrText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.sub,
  },
  confirmBtn: {
    minWidth: 200,
  },
});

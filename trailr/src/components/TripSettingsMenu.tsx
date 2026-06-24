/**
 * TripSettingsMenu — owner-only trip management sheet.
 * Change visibility (public / followers / private), archive/unarchive,
 * or permanently delete the trip. Used from the builder header and
 * from each trip card on the profile.
 */
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
import { useUpdateTrip, useDeleteTrip } from '@trailr/db';
import type { TransportMode, TripStatus, TripVisibility } from '@trailr/db';
import { useToast } from './Toast';

interface MenuTrip {
  id: string;
  title: string;
  visibility: TripVisibility;
  status: TripStatus;
  transport_mode?: TransportMode;
  user_id: string;
}

interface Props {
  visible: boolean;
  trip: MenuTrip | null;
  onClose: () => void;
  /** Called after a successful delete (e.g. navigate away from the builder). */
  onDeleted?: () => void;
}

const VISIBILITY_OPTIONS: Array<{ value: TripVisibility; glyph: string; label: string; desc: string }> = [
  { value: 'public', glyph: '🌏', label: 'Public', desc: 'Anyone can find and view this trip.' },
  { value: 'followers', glyph: '👥', label: 'Followers only', desc: 'Only people who follow you can see it.' },
  { value: 'private', glyph: '🔒', label: 'Private', desc: 'Only you can see it.' },
];

const TRANSPORT_OPTIONS: Array<{ value: TransportMode; label: string; desc: string }> = [
  { value: 'mixed', label: 'Mixed', desc: 'Balance transit, walking and flexibility.' },
  { value: 'train', label: 'Train', desc: 'Prefer hotels close to rail stations.' },
  { value: 'transit', label: 'Transit', desc: 'Favor metro and local transit access.' },
  { value: 'car', label: 'Car', desc: 'Skip station scoring for this trip.' },
  { value: 'walk', label: 'Walk', desc: 'Keep hotel ranking focused on sights.' },
];

export function TripSettingsMenu({ visible, trip, onClose, onDeleted }: Props) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const toast = useToast();

  const updateMut = useUpdateTrip(trip?.id ?? '');
  const deleteMut = useDeleteTrip();

  useEffect(() => {
    if (visible) {
      setConfirmingDelete(false);
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

  const isArchived = trip.status === 'archived';
  const activeTransport = trip.transport_mode ?? 'mixed';

  const setVisibility = (v: TripVisibility) => {
    if (v === trip.visibility) return;
    updateMut.mutate(
      { visibility: v },
      {
        onSuccess: () => toast(`Now ${v === 'followers' ? 'followers only' : v}`),
        onError: () => toast('Could not update visibility'),
      },
    );
  };

  const toggleArchive = () => {
    updateMut.mutate(
      { status: isArchived ? 'draft' : 'archived' },
      {
        onSuccess: () => {
          toast(isArchived ? 'Trip unarchived' : 'Trip archived');
          onClose();
        },
        onError: () => toast('Could not update trip'),
      },
    );
  };

  const setTransportMode = (mode: TransportMode) => {
    if (mode === activeTransport) return;
    updateMut.mutate(
      { transport_mode: mode },
      {
        onSuccess: () => toast('Travel style updated'),
        onError: () => toast('Could not update travel style'),
      },
    );
  };

  const confirmDelete = () => {
    deleteMut.mutate(
      { tripId: trip.id, userId: trip.user_id },
      {
        onSuccess: () => {
          toast('Trip deleted');
          onClose();
          onDeleted?.();
        },
        onError: () => toast('Could not delete trip'),
      },
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.handle} />

              <Text style={styles.heading}>Trip settings</Text>
              <Text style={styles.sub} numberOfLines={1}>{trip.title}</Text>

              {/* Visibility */}
              <Text style={styles.sectionLabel}>Visibility</Text>
              <View style={styles.optionList}>
                {VISIBILITY_OPTIONS.map((opt) => {
                  const active = trip.visibility === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.optionCard, active && styles.optionCardActive]}
                      onPress={() => setVisibility(opt.value)}
                      activeOpacity={0.85}
                      disabled={updateMut.isPending}
                    >
                      <Text style={styles.optionGlyph}>{opt.glyph}</Text>
                      <View style={styles.optionText}>
                        <Text style={styles.optionTitle}>{opt.label}</Text>
                        <Text style={styles.optionDesc}>{opt.desc}</Text>
                      </View>
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Travel style */}
              <Text style={styles.sectionLabel}>Getting around</Text>
              <View style={styles.transportGrid}>
                {TRANSPORT_OPTIONS.map((opt) => {
                  const active = activeTransport === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.transportCard, active && styles.optionCardActive]}
                      onPress={() => setTransportMode(opt.value)}
                      activeOpacity={0.85}
                      disabled={updateMut.isPending}
                    >
                      <Text style={styles.optionTitle}>{opt.label}</Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Archive */}
              <TouchableOpacity style={styles.actionRow} onPress={toggleArchive} disabled={updateMut.isPending} activeOpacity={0.8}>
                <Text style={styles.actionGlyph}>{isArchived ? '↩' : '🗄'}</Text>
                <View style={styles.optionText}>
                  <Text style={styles.actionTitle}>{isArchived ? 'Unarchive trip' : 'Archive trip'}</Text>
                  <Text style={styles.optionDesc}>
                    {isArchived ? 'Restore it to your trips as a draft.' : 'Hide it from your profile. You can restore it later.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Delete */}
              {confirmingDelete ? (
                <View style={styles.dangerConfirm}>
                  <Text style={styles.dangerConfirmText}>
                    Delete “{trip.title}” forever? This removes all its days, stops and photos.
                  </Text>
                  <View style={styles.dangerActions}>
                    <TouchableOpacity onPress={() => setConfirmingDelete(false)} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmDelete}
                      style={[styles.deleteBtn, deleteMut.isPending && styles.deleteBtnDisabled]}
                      disabled={deleteMut.isPending}
                    >
                      <Text style={styles.deleteBtnText}>{deleteMut.isPending ? 'Deleting…' : 'Delete forever'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.actionRow} onPress={() => setConfirmingDelete(true)} activeOpacity={0.8}>
                  <Text style={styles.actionGlyph}>🗑</Text>
                  <View style={styles.optionText}>
                    <Text style={[styles.actionTitle, styles.dangerText]}>Delete trip</Text>
                    <Text style={styles.optionDesc}>Permanently remove this trip and everything in it.</Text>
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(44,42,38,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingTop: spacing.md,
    gap: spacing.md,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginBottom: spacing.sm },
  heading: { fontSize: fontSize.xl, fontWeight: '700', color: colors.ink },
  sub: { fontSize: fontSize.md, color: colors.sub, marginTop: -spacing.sm },
  sectionLabel: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '700', marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  optionList: { gap: spacing.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  optionCardActive: { borderColor: colors.acc, backgroundColor: colors.accSoft },
  optionGlyph: { fontSize: 20, width: 26, textAlign: 'center' },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  optionDesc: { fontSize: fontSize.sm, color: colors.sub, lineHeight: 18 },
  transportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  transportCard: {
    width: '48%',
    minWidth: 140,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.acc },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.acc },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  actionGlyph: { fontSize: 20, width: 26, textAlign: 'center' },
  actionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  dangerText: { color: '#c0392b' },
  dangerConfirm: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  dangerConfirmText: { fontSize: fontSize.md, color: colors.ink, lineHeight: 22 },
  dangerActions: { flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end', alignItems: 'center' },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cancelText: { fontSize: fontSize.md, color: colors.sub },
  deleteBtn: { backgroundColor: '#c0392b', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radius.sm },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
});

/**
 * Trip Builder — day timeline + route map.
 * Build a plan: tap the map to drop stops, edit/reorder them, then publish.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, fontSize, radius, shadow } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { CoverImage } from '../../src/components/CoverImage';
import { MapView } from '../../src/components/MapView';
import { MapSheet } from '../../src/components/MapSheet';
import { PressableScale } from '../../src/components/PressableScale';
import { useTrip, useTripStops, useUpdateTrip, fetchTripDays, createStop, updateStop, deleteStop } from '@trailr/db';
import type { StopWithMedia, TripDayRow } from '@trailr/db';
import { useAuthStore } from '../../src/stores/authStore';
import { useToast } from '../../src/components/Toast';
import { useResponsive } from '../../src/hooks/useResponsive';
import { TripMembersModal } from '../../src/components/TripMembersModal';

const CATEGORIES = ['place', 'food', 'landmark', 'activity', 'hotel', 'flight', 'transport', 'note'] as const;
type Category = (typeof CATEGORIES)[number];

interface BuilderDay {
  id: string;
  n: number;
  place: string;
  date: string | null;
  stops: StopWithMedia[];
}

interface Coord {
  latitude: number;
  longitude: number;
}

function StopCard({
  stop,
  onEdit,
  onRemove,
  onUp,
  onDown,
  canUp,
  canDown,
}: {
  stop: StopWithMedia;
  onEdit: () => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const photoUri = stop.media?.[0] ? stop.media[0].cdn_url ?? stop.media[0].url : undefined;
  return (
    <View style={styles.stopCard}>
      <PressableScale
        style={styles.stopMain}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${stop.location_name ?? 'stop'}`}
      >
        <View style={styles.stopPhoto}>
          <CoverImage uri={photoUri} style={styles.stopPhotoImg} labelStyle={styles.stopPhotoLabel} />
        </View>
        <View style={styles.stopMeta}>
          <Text style={styles.stopLocation}>{stop.location_name ?? 'Untitled stop'}</Text>
          <View style={styles.stopMetaRow}>
            {stop.category ? <Chip dot={false} style={styles.stopCat}>{stop.category}</Chip> : null}
            {stop.planned_time ? <Chip dot accent style={styles.stopTime}>{stop.planned_time}</Chip> : null}
          </View>
          {stop.notes ? <Text style={styles.stopCaption} numberOfLines={2}>{stop.notes}</Text> : null}
          {stop.latitude == null && (
            <Text style={styles.noLoc}>⚠ no location — tap the map to pin one</Text>
          )}
        </View>
      </PressableScale>
      <View style={styles.stopActions}>
        <PressableScale onPress={onUp} disabled={!canUp} accessibilityLabel="Move up">
          <Text style={[styles.reorderIcon, !canUp && styles.reorderDisabled]}>▲</Text>
        </PressableScale>
        <PressableScale onPress={onDown} disabled={!canDown} accessibilityLabel="Move down">
          <Text style={[styles.reorderIcon, !canDown && styles.reorderDisabled]}>▼</Text>
        </PressableScale>
        <PressableScale onPress={onRemove} accessibilityLabel="Remove stop">
          <Text style={styles.removeBtnText}>✕</Text>
        </PressableScale>
      </View>
    </View>
  );
}

export default function BuilderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = id ?? '';
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isPhone } = useResponsive();

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: stops = [], isLoading: stopsLoading } = useTripStops(tripId);
  const { data: dayRows = [], isLoading: daysLoading } = useQuery({
    queryKey: ['trip', tripId, 'days'],
    queryFn: () => fetchTripDays(tripId),
    enabled: !!tripId,
  });
  const updateTrip = useUpdateTrip(tripId);
  const userId = useAuthStore((s) => s.user?.id) ?? '';

  const [activeDay, setActiveDay] = useState(0);
  const [membersOpen, setMembersOpen] = useState(false);

  // Add / edit stop form.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StopWithMedia | null>(null);
  const [formCoord, setFormCoord] = useState<Coord | null>(null);
  const [formLoc, setFormLoc] = useState('');
  const [formCat, setFormCat] = useState<Category>('place');
  const [formTime, setFormTime] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refreshStops = () => queryClient.invalidateQueries({ queryKey: ['stops', 'trip', tripId] });

  // Group the trip's real stops under their days.
  const days: BuilderDay[] = useMemo(
    () =>
      dayRows.map((d: TripDayRow) => ({
        id: d.id,
        n: d.day_number,
        place: d.place ?? '',
        date: d.date,
        stops: stops.filter((s) => s.day_id === d.id).sort((a, b) => a.sort_order - b.sort_order),
      })),
    [dayRows, stops],
  );
  const currentDay = days[activeDay];

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormCoord(null);
    setFormLoc('');
    setFormCat('place');
    setFormTime('');
    setFormNotes('');
  };

  const openAdd = (coord?: Coord) => {
    setEditing(null);
    setFormCoord(coord ?? null);
    setFormLoc('');
    setFormCat('place');
    setFormTime('');
    setFormNotes('');
    setFormOpen(true);
  };

  const openEdit = (s: StopWithMedia) => {
    setEditing(s);
    setFormCoord(s.latitude != null && s.longitude != null ? { latitude: s.latitude, longitude: s.longitude } : null);
    setFormLoc(s.location_name ?? '');
    setFormCat((CATEGORIES.includes(s.category as Category) ? (s.category as Category) : 'place'));
    setFormTime(s.planned_time ?? '');
    setFormNotes(s.notes ?? '');
    setFormOpen(true);
  };

  // Tapping the map drops a new stop there (the modal covers the map, so this
  // only fires when the form is closed).
  const onMapPress = (coord: Coord) => {
    if (!formOpen) openAdd(coord);
  };

  const submitForm = async () => {
    const name = formLoc.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateStop(editing.id, {
          location_name: name,
          category: formCat,
          ...(formTime.trim() ? { planned_time: formTime.trim() } : {}),
          ...(formNotes.trim() ? { notes: formNotes.trim() } : {}),
          ...(formCoord ? { latitude: formCoord.latitude, longitude: formCoord.longitude } : {}),
        });
        toast('Stop updated');
      } else {
        await createStop({
          trip_id: tripId,
          day_id: currentDay?.id,
          user_id: userId,
          status: 'planned',
          category: formCat,
          location_name: name,
          latitude: formCoord?.latitude ?? null,
          longitude: formCoord?.longitude ?? null,
          place_id: null,
          planned_time: formTime.trim() || null,
          duration_mins: null,
          sort_order: currentDay?.stops.length ?? 0,
          notes: formNotes.trim() || null,
          caption: null,
          captured_at: null,
          batch_date: null,
        });
        toast('Stop added');
      }
      refreshStops();
      closeForm();
    } catch (e) {
      toast(editing ? 'Could not update stop' : 'Could not add stop');
    } finally {
      setSubmitting(false);
    }
  };

  const removeStop = async (stopId: string) => {
    try {
      await deleteStop(stopId);
      refreshStops();
      toast('Stop removed');
    } catch (e) {
      toast('Could not remove stop');
    }
  };

  // Swap a stop's sort_order with its neighbour to reorder within the day.
  const moveStop = async (si: number, dir: -1 | 1) => {
    const arr = currentDay?.stops ?? [];
    const j = si + dir;
    if (j < 0 || j >= arr.length) return;
    const a = arr[si];
    const b = arr[j];
    try {
      await Promise.all([
        updateStop(a.id, { sort_order: b.sort_order }),
        updateStop(b.id, { sort_order: a.sort_order }),
      ]);
      refreshStops();
    } catch (e) {
      toast('Could not reorder');
    }
  };

  const handlePublish = async () => {
    try {
      await updateTrip.mutateAsync({ status: 'active', visibility: 'public' });
      toast('Trip published 🎉');
      router.push('/(tabs)/');
    } catch (e) {
      toast('Publish failed — please try again');
    }
  };

  if (tripLoading || stopsLoading || daysLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.acc} size="large" />
      </View>
    );
  }
  if (!trip) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Trip not found</Text>
        <Btn sm onPress={() => router.back()}>Go back</Btn>
      </View>
    );
  }

  // Map pins from the current day's located stops.
  const pins = (currentDay?.stops ?? [])
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => ({
      id: s.id,
      latitude: s.latitude as number,
      longitude: s.longitude as number,
      location: s.location_name ?? '',
      caption: s.notes ?? '',
    }));
  // Include the pending pin (where the user just tapped) so they see it before saving.
  if (formCoord && !editing) {
    pins.push({ id: '__pending__', latitude: formCoord.latitude, longitude: formCoord.longitude, location: 'New stop', caption: '' });
  }
  const dayCenter = pins[0] ? { latitude: pins[0].latitude, longitude: pins[0].longitude } : null;
  const fallback = { latitude: 35.0116, longitude: 135.7681 };

  const timeline = (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayTabsRow}>
        {days.map((d, i) => (
          <PressableScale key={d.n} onPress={() => setActiveDay(i)}>
            <View style={[styles.dayTab, i === activeDay && styles.dayTabActive]}>
              <Text style={[styles.dayTabLabel, i === activeDay && styles.dayTabLabelActive]}>
                D{d.n} · {d.place}
              </Text>
            </View>
          </PressableScale>
        ))}
      </ScrollView>

      {currentDay && (
        <View style={styles.currentDayHeader}>
          <View style={styles.dayCircle}>
            <Text style={styles.dayNum}>{currentDay.n}</Text>
          </View>
          <View>
            <Text style={styles.currentDayTitle}>Day {currentDay.n} — {currentDay.place}</Text>
            <Text style={styles.currentDaySub}>{currentDay.date} · {currentDay.stops.length} stops</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Btn sm onPress={() => openAdd()}>＋ Add stop</Btn>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.stopsContent}>
        {currentDay?.stops.length === 0 && (
          <Text style={styles.emptyHint}>No stops yet. Tap the map to drop one, or use ＋ Add stop.</Text>
        )}
        {currentDay?.stops.map((s, si) => (
          <View key={s.id} style={styles.stopRow}>
            <View style={styles.railCol}>
              <View style={[styles.railDot, si === 0 && styles.railDotFirst]} />
              {si < currentDay.stops.length - 1 && <View style={styles.railLine} />}
            </View>
            <View style={{ flex: 1 }}>
              <StopCard
                stop={s}
                onEdit={() => openEdit(s)}
                onRemove={() => removeStop(s.id)}
                onUp={() => moveStop(si, -1)}
                onDown={() => moveStop(si, 1)}
                canUp={si > 0}
                canDown={si < currentDay.stops.length - 1}
              />
            </View>
          </View>
        ))}

        <PressableScale style={styles.addZone} onPress={() => openAdd()}>
          <Text style={styles.addZoneText}>＋ Add a stop</Text>
        </PressableScale>
      </ScrollView>
    </>
  );

  const mapBlock = (
    <MapView
      initialLatitude={dayCenter?.latitude ?? fallback.latitude}
      initialLongitude={dayCenter?.longitude ?? fallback.longitude}
      initialZoom={12}
      posts={pins}
      center={dayCenter}
      onMapPress={onMapPress}
    >
      <View style={styles.routeInfo}>
        <Text style={styles.routeInfoTitle}>Day {currentDay?.n} · {currentDay?.place}</Text>
        <Text style={styles.routeInfoSub}>{currentDay?.stops.length ?? 0} stops · tap map to add</Text>
      </View>
    </MapView>
  );

  return (
    <View style={styles.root}>
      {/* toolbar */}
      <View style={styles.toolbar}>
        <Wordmark size={22} />
        {!isPhone && (
          <>
            <PressableScale onPress={() => router.back()}>
              <Text style={styles.back}>‹ back</Text>
            </PressableScale>
            <View style={styles.separator} />
          </>
        )}
        <Text style={styles.tripName} numberOfLines={1}>{trip.title}</Text>
        <View style={{ flex: 1 }} />
        <Chip dot={false}>✓ Auto-saved</Chip>
        <Btn sm onPress={() => setMembersOpen(true)}>👥 Friends</Btn>
        <Btn solid sm onPress={handlePublish} loading={updateTrip.isPending}>Publish</Btn>
      </View>

      {/* forked draft banner */}
      {trip.forked_from_id && (
        <View style={styles.skimBanner}>
          <Text style={styles.skimBannerText}>
            ✦ Forked draft — edit freely. Add your own stays, flights & notes, then publish.
          </Text>
        </View>
      )}

      {isPhone ? (
        <View style={styles.phoneBody}>
          <View style={styles.timelineColPhone}>{timeline}</View>
          <MapSheet title={`🗺  Day ${currentDay?.n ?? ''} route`}>{mapBlock}</MapSheet>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.timelineCol}>{timeline}</View>
          <View style={styles.mapCol}>{mapBlock}</View>
        </View>
      )}

      {/* Add / edit stop modal */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={closeForm}>
        <PressableScale style={styles.modalBackdrop} onPress={closeForm}>
          <PressableScale style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit stop' : `Add a stop${currentDay ? ` to Day ${currentDay.n}` : ''}`}
            </Text>

            <View style={styles.locStatus}>
              <Text style={styles.locStatusText}>
                {formCoord
                  ? '📍 Location pinned'
                  : editing
                    ? 'No location set'
                    : 'Tip: close and tap the map to pin a location'}
              </Text>
            </View>

            <Text style={styles.modalLabel}>Place</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fushimi Inari Shrine"
              placeholderTextColor={colors.sub}
              value={formLoc}
              onChangeText={setFormLoc}
              autoFocus
            />

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map((c) => (
                <PressableScale key={c} onPress={() => setFormCat(c)}>
                  <Chip dot={false} accent={c === formCat}>{c}</Chip>
                </PressableScale>
              ))}
            </View>

            <Text style={styles.modalLabel}>Time (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 09:00"
              placeholderTextColor={colors.sub}
              value={formTime}
              onChangeText={setFormTime}
            />

            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Anything to remember…"
              placeholderTextColor={colors.sub}
              value={formNotes}
              onChangeText={setFormNotes}
              multiline
            />

            <View style={styles.modalActions}>
              <Btn sm onPress={closeForm}>Cancel</Btn>
              <Btn solid sm onPress={submitForm} loading={submitting} disabled={!formLoc.trim()}>
                {editing ? 'Save' : 'Add stop'}
              </Btn>
            </View>
          </PressableScale>
        </PressableScale>
      </Modal>

      <TripMembersModal
        tripId={tripId}
        isOwner={trip.user_id === userId}
        visible={membersOpen}
        onClose={() => setMembersOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  skimBanner: {
    backgroundColor: colors.accSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.acc,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  skimBannerText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '600' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontSize: fontSize.lg, color: colors.sub },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  back: { color: colors.sub, fontSize: fontSize.sm },
  separator: { width: 1, height: 20, backgroundColor: colors.line, marginHorizontal: 4 },
  tripName: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink, flexShrink: 1 },

  body: { flex: 1, flexDirection: 'row' },
  phoneBody: { flex: 1 },

  timelineCol: {
    width: 440,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    flexShrink: 0,
    flexDirection: 'column',
  },
  timelineColPhone: { flex: 1 },

  dayTabsRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dayTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line },
  dayTabActive: { backgroundColor: colors.accSoft, borderColor: colors.acc },
  dayTabLabel: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '600' },
  dayTabLabelActive: { color: colors.acc },

  currentDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dayCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.acc, alignItems: 'center', justifyContent: 'center' },
  dayNum: { color: colors.white, fontSize: fontSize.sm, fontWeight: '800' },
  currentDayTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  currentDaySub: { fontSize: fontSize.xs, color: colors.sub },

  stopsContent: { padding: spacing.lg, gap: 0 },
  emptyHint: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center', paddingVertical: spacing.lg },

  stopRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  railCol: { width: 20, alignItems: 'center', paddingTop: 14 },
  railDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper },
  railDotFirst: { borderColor: colors.acc, backgroundColor: colors.acc },
  railLine: { width: 2, flex: 1, backgroundColor: colors.line, marginTop: 2, minHeight: 20 },

  stopCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stopMain: { flexDirection: 'row', gap: spacing.md, flex: 1 },
  stopPhoto: { width: 72, height: 72, backgroundColor: colors.panel, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stopPhotoLabel: { fontSize: 10, color: colors.sub, fontFamily: 'monospace' },
  stopPhotoImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 },
  stopMeta: { flex: 1, gap: 4 },
  stopLocation: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  stopMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  stopCat: { alignSelf: 'flex-start' },
  stopTime: { alignSelf: 'flex-start' },
  stopCaption: { fontSize: fontSize.xs, color: colors.sub, lineHeight: 16 },
  noLoc: { fontSize: fontSize.xs, color: colors.acc },

  stopActions: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingLeft: 4 },
  reorderIcon: { fontSize: 12, color: colors.sub },
  reorderDisabled: { color: colors.line },
  removeBtnText: { fontSize: fontSize.sm, color: colors.sub },

  addZone: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  addZoneText: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(44,42,38,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalSheet: { width: '100%', maxWidth: 440, backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.xl, gap: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink, marginBottom: spacing.xs },
  locStatus: { backgroundColor: colors.panel, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  locStatusText: { fontSize: fontSize.sm, color: colors.ink },
  modalLabel: { fontSize: fontSize.sm, color: colors.sub, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.panel,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg },

  mapCol: { flex: 1 },
  routeInfo: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: colors.paper,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
    ...shadow.sm,
  },
  routeInfoTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.ink },
  routeInfoSub: { fontSize: fontSize.xs, color: colors.sub },
});

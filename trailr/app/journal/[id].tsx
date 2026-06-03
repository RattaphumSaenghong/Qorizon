/**
 * Trip Journal — JournalA
 * Real trip data, scroll-synced day scrubber, fork modal → builder
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Avatar } from '../../src/components/Avatar';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { MapView, MapPin } from '../../src/components/MapView';
import { ForkModal } from '../../src/components/ForkModal';
import { getSupabaseClient } from '@trailr/db';
import { Trip, Moment, Day } from '../../src/data/mockTrips';

// ── Date helpers ─────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtShort(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}
function fmtMonthYear(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

// ── Fetch + assemble a trip from the DB into the Trip shape ───
async function fetchJournal(tripId: string): Promise<Trip | null> {
  const db = getSupabaseClient() as any;

  const { data: t, error } = await db
    .from('trips')
    .select(`*, author:users!trips_user_id_fkey(username,display_name)`)
    .eq('id', tripId)
    .maybeSingle();
  if (error) throw error;
  if (!t) return null;

  const { data: dayRows } = await db
    .from('trip_days').select('*').eq('trip_id', tripId).order('day_number');
  const { data: stopRows } = await db
    .from('stops').select('*').eq('trip_id', tripId).eq('status', 'visited').order('sort_order');

  const allStops = stopRows ?? [];

  const days: Day[] = (dayRows ?? []).map((d: any) => ({
    n: d.day_number,
    place: d.place ?? '',
    date: fmtShort(d.date),
    moments: allStops
      .filter((s: any) => s.day_id === d.id)
      .map((s: any, i: number): Moment => ({
        time: s.planned_time ?? '',
        location: s.location_name ?? '',
        caption: s.caption ?? '',
        latitude: s.latitude ?? 0,
        longitude: s.longitude ?? 0,
        hasVideo: false,
        hasAudio: false,
        photoHeight: [200, 170, 150][i % 3],
      })),
  }));

  const likeCount = allStops.reduce((sum: number, s: any) => sum + (s.like_count ?? 0), 0);
  const center = allStops[0] ?? { latitude: 13.75, longitude: 100.5 };

  return {
    id: t.id,
    title: t.title,
    author: t.author?.display_name ?? t.author?.username ?? '',
    authorHandle: '@' + (t.author?.username ?? 'unknown'),
    duration: `${days.length} days`,
    photoCount: allStops.length,
    audioCount: 0,
    forkCount: t.fork_count ?? 0,
    likeCount,
    coverLocation: allStops[0]?.location_name ?? t.title,
    startDate: fmtMonthYear(t.start_date),
    centerLat: center.latitude,
    centerLon: center.longitude,
    centerZoom: 5,
    days,
    forkedFrom: undefined,
  };
}

const DAY_PINS: Array<{ x: `${number}%`; y: `${number}%` }> = [
  { x: '28%', y: '62%' },
  { x: '42%', y: '44%' },
  { x: '58%', y: '34%' },
  { x: '72%', y: '22%' },
];

const JOURNAL_TABS = ['Journal', 'Map', 'Album', 'Bookings'];

// ── Moment card ──────────────────────────────────────────────
function MomentCard({ moment, last }: { moment: Moment; last: boolean }) {
  return (
    <View style={styles.moment}>
      <View style={styles.gutter}>
        <Text style={styles.gutterTime}>{moment.time}</Text>
        <View style={styles.gutterDot} />
        {!last && <View style={styles.gutterLine} />}
      </View>
      <View style={styles.momentContent}>
        <Chip dot accent style={styles.locChip}>{moment.location}</Chip>
        <View style={[styles.momentPhoto, { height: moment.photoHeight }]}>
          <Text style={styles.photoLabel}>[ photo ]</Text>
          {moment.hasVideo && (
            <View style={styles.videoTag}>
              <Text style={styles.videoTagText}>▶ 0:18</Text>
            </View>
          )}
        </View>
        <Text style={styles.caption}>{moment.caption}</Text>
        {moment.hasAudio && (
          <TouchableOpacity style={styles.audioChip} activeOpacity={0.75}>
            <Text style={styles.audioPlay}>▶</Text>
            <Text style={styles.audioText}>{moment.audioLabel}</Text>
            <Text style={styles.audioWave}>≈≈≈≈≈</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Day heading ──────────────────────────────────────────────
function DayHeader({ day }: { day: Day }) {
  return (
    <View style={styles.dayHead}>
      <View style={styles.dayCircle}>
        <Text style={styles.dayNum}>{day.n}</Text>
      </View>
      <Text style={styles.dayTitle}>Day {day.n} — {day.place}</Text>
      <View style={{ flex: 1 }} />
      <Chip dot={false}>{day.date}</Chip>
      <Chip dot={false}>{day.moments.length * 3 + 6} moments</Chip>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function JournalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['journal', id],
    queryFn: () => fetchJournal(id!),
    enabled: !!id,
  });
  if (error) console.error('[Journal] query error:', error);

  const [activeTab, setActiveTab] = useState('Journal');
  const [currentDay, setCurrentDay] = useState(1);
  const [forkVisible, setForkVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Rough scroll-to-day sync: each day block is ~(moments * 250 + 100)px
  const dayOffsets = useRef<number[]>([]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const offsets = dayOffsets.current;
    let active = 1;
    for (let i = 0; i < offsets.length; i++) {
      if (y >= offsets[i] - 60) active = i + 1;
    }
    if (active !== currentDay) setCurrentDay(active);
  }, [currentDay]);

  const scrollToDay = (n: number) => {
    const offset = dayOffsets.current[n - 1] ?? 0;
    scrollRef.current?.scrollTo({ y: offset, animated: true });
    setCurrentDay(n);
  };

  const handleForkConfirm = (mode: 'full' | 'skim') => {
    setForkVisible(false);
    // When wired to the backend: useForkTrip().mutate({ sourceTripId: id, mode }).
    // For now, open the builder on the (mock) forked trip.
    router.push(`/builder/${id}?mode=${mode}`);
  };

  if (isLoading) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={colors.acc} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.notFound}>
        <Text style={{ color: colors.sub }}>Trip not found</Text>
        <Btn sm onPress={() => router.back()}>Go back</Btn>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ back to feed</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Chip dot={false}>♡ {trip.likeCount.toLocaleString()}</Chip>
        <Btn sm>↗ Share</Btn>
        <Btn solid sm onPress={() => setForkVisible(true)}>⑂ Use this trip</Btn>
        <Avatar size={34} ring />
      </View>

      <View style={styles.body}>
        {/* ── Left: journal ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.journalCol}
          contentContainerStyle={styles.journalContent}
          onScroll={onScroll}
          scrollEventThrottle={100}
          showsVerticalScrollIndicator={false}
        >
          {/* hero cover */}
          <View style={styles.hero}>
            <View style={styles.heroCover}>
              <Text style={styles.heroCoverLabel}>[ trip cover ]</Text>
            </View>
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>{trip.title}</Text>
            </View>
          </View>

          {/* author */}
          <View style={styles.authorRow}>
            <Avatar size={42} ring />
            <View style={styles.authorMeta}>
              <Text style={styles.authorHandle}>{trip.authorHandle}</Text>
              <Text style={styles.authorStats}>
                {trip.startDate} · {trip.duration} · {trip.photoCount} photos
                {trip.audioCount > 0 ? ` · ${trip.audioCount} audio notes` : ''}
              </Text>
              {trip.forkedFrom && (
                <Text style={styles.forkedFrom}>↳ based on {trip.forkedFrom}</Text>
              )}
            </View>
            <View style={{ flex: 1 }} />
            <Chip dot={false} accent>⑂ {trip.forkCount} forks</Chip>
          </View>

          {/* tabs */}
          <View style={styles.tabs}>
            {JOURNAL_TABS.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  setActiveTab(t);
                  if (t === 'Album') router.push(`/album/${id}`);
                  if (t === 'Bookings') router.push(`/booking/${id}`);
                }}
              >
                <Chip dot={false} accent={t === activeTab}>{t}</Chip>
              </TouchableOpacity>
            ))}
          </View>

          {/* day blocks */}
          {trip.days.map((day, di) => (
            <View
              key={day.n}
              onLayout={(e) => {
                dayOffsets.current[di] = e.nativeEvent.layout.y;
              }}
            >
              <DayHeader day={day} />
              {day.moments.map((m, mi) => (
                <MomentCard
                  key={`${day.n}-${m.time}`}
                  moment={m}
                  last={mi === day.moments.length - 1}
                />
              ))}
            </View>
          ))}

          {/* bottom CTA */}
          <View style={styles.bottomCta}>
            <Text style={styles.bottomCtaText}>Inspired by this trip?</Text>
            <Btn solid onPress={() => setForkVisible(true)}>⑂ Use this trip as your template</Btn>
          </View>
        </ScrollView>

        {/* ── Right: sticky map ── */}
        <View style={styles.mapCol}>
          <View style={styles.mapWrapper}>
          <MapView initialLongitude={trip.centerLon} initialLatitude={trip.centerLat} initialZoom={trip.centerZoom}>
            {trip.days.map((day, i) => (
              <MapPin
                key={day.n}
                x={DAY_PINS[i % DAY_PINS.length].x}
                y={DAY_PINS[i % DAY_PINS.length].y}
                label={day.n}
                accent={day.n <= currentDay}
                size={26}
              />
            ))}

            {/* current day badge */}
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>
                Day {currentDay} of {trip.days.length} · {trip.days[currentDay - 1]?.place}
              </Text>
            </View>

            {/* day scrubber */}
            <View style={styles.scrubber}>
              {trip.days.map((day) => (
                <TouchableOpacity key={day.n} onPress={() => scrollToDay(day.n)}>
                  <View style={[
                    styles.scrubDot,
                    { backgroundColor: day.n === currentDay ? colors.acc : day.n < currentDay ? colors.acc : colors.line },
                    day.n === currentDay && styles.scrubDotActive,
                  ]}>
                    {day.n === currentDay && (
                      <Text style={styles.scrubDotLabel}>{day.n}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </MapView>
          </View>

          {/* map footer: place list */}
          <View style={styles.mapFooter}>
            {trip.days.map((day) => (
              <TouchableOpacity
                key={day.n}
                style={[styles.mapFooterItem, day.n === currentDay && styles.mapFooterItemActive]}
                onPress={() => scrollToDay(day.n)}
              >
                <Text style={[styles.mapFooterDay, day.n === currentDay && styles.mapFooterDayActive]}>
                  D{day.n}
                </Text>
                <Text style={styles.mapFooterPlace} numberOfLines={1}>{day.place}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── Fork modal ── */}
      <ForkModal
        visible={forkVisible}
        trip={trip}
        onConfirm={handleForkConfirm}
        onCancel={() => setForkVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, flexDirection: 'column' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
    backgroundColor: colors.paper,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: colors.sub, fontSize: fontSize.md },

  body: { flex: 1, flexDirection: 'row', overflow: 'hidden' },

  // journal
  journalCol: { flex: 1 },
  journalContent: { padding: spacing.xxl, gap: spacing.lg },

  hero: { position: 'relative' },
  heroCover: {
    height: 180,
    backgroundColor: colors.panel,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  heroCoverLabel: { fontSize: fontSize.sm, color: colors.sub, fontFamily: 'monospace' },
  heroOverlay: {
    position: 'absolute',
    left: 16,
    bottom: 14,
    backgroundColor: 'rgba(251,249,245,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.ink },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  authorMeta: { gap: 3 },
  authorHandle: { fontSize: fontSize.base, fontWeight: '600', color: colors.ink },
  authorStats: { fontSize: fontSize.sm, color: colors.sub },
  forkedFrom: { fontSize: fontSize.xs, color: colors.acc },

  tabs: { flexDirection: 'row', gap: spacing.sm },

  // day blocks
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: spacing.sm,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  dayTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },

  // moments
  moment: { flexDirection: 'row', gap: spacing.md },
  gutter: { width: 52, alignItems: 'center', flexShrink: 0 },
  gutterTime: { fontSize: 12, color: colors.sub, marginBottom: 4 },
  gutterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: colors.acc,
    backgroundColor: colors.accSoft,
  },
  gutterLine: { width: 2, flex: 1, backgroundColor: colors.line, marginTop: 2, minHeight: 20 },
  momentContent: { flex: 1, paddingBottom: spacing.xl, gap: spacing.sm },
  locChip: { alignSelf: 'flex-start' },
  momentPhoto: {
    backgroundColor: colors.panel,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  photoLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  videoTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(44,42,38,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  videoTagText: { fontSize: fontSize.xs, color: colors.white },
  caption: { fontSize: fontSize.md, color: colors.ink, lineHeight: 22 },
  audioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  audioPlay: { fontSize: fontSize.sm, color: colors.acc },
  audioText: { fontSize: fontSize.sm, color: colors.ink },
  audioWave: { fontSize: fontSize.sm, color: colors.sub },

  bottomCta: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: spacing.lg,
  },
  bottomCtaText: { fontSize: fontSize.md, color: colors.sub },

  // sticky map
  mapCol: {
    width: 420,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    flexShrink: 0,
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  mapWrapper: {
    flex: 1,
  },
  dayBadge: {
    position: 'absolute',
    left: 16,
    top: 16,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  dayBadgeText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.ink },
  scrubber: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: colors.paper,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
    alignItems: 'center',
  },
  scrubDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubDotActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  scrubDotLabel: { fontSize: 10, color: colors.white, fontWeight: '700' },

  // map footer
  mapFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexShrink: 0,
  },
  mapFooterItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    gap: 2,
  },
  mapFooterItemActive: {
    backgroundColor: colors.accSoft,
  },
  mapFooterDay: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.sub,
  },
  mapFooterDayActive: {
    color: colors.acc,
  },
  mapFooterPlace: {
    fontSize: fontSize.xs,
    color: colors.sub,
    maxWidth: 80,
  },
});

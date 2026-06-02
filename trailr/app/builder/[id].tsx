/**
 * Trip Builder — BuildB: day timeline + route map
 * Pre-populated from the forked trip data
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { MapView, MapPin } from '../../src/components/MapView';
import { getTripById, Moment } from '../../src/data/mockTrips';

const PIN_POSITIONS: Array<{ x: `${number}%`; y: `${number}%` }> = [
  { x: '28%', y: '64%' },
  { x: '46%', y: '44%' },
  { x: '64%', y: '30%' },
  { x: '78%', y: '48%' },
];

function StopCard({ moment, index, onRemove }: {
  moment: Moment;
  index: number;
  onRemove: () => void;
}) {
  return (
    <View style={styles.stopCard}>
      <View style={styles.stopPhoto}>
        <Text style={styles.stopPhotoLabel}>[ photo ]</Text>
      </View>
      <View style={styles.stopMeta}>
        <Text style={styles.stopLocation}>{moment.location}</Text>
        <Chip dot accent style={styles.stopTime}>{moment.time}</Chip>
        <Text style={styles.stopCaption} numberOfLines={2}>{moment.caption}</Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BuilderScreen() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const sourceTrip = getTripById(id ?? '');
  const isSkim = mode === 'skim';

  const [activeDay, setActiveDay] = useState(0);
  const [saved, setSaved] = useState(false);

  // Mutable copy of trip days for the builder
  const [days, setDays] = useState(() =>
    sourceTrip?.days.map((d) => ({ ...d, moments: [...d.moments] })) ?? []
  );

  const currentDay = days[activeDay];

  const removeStop = (dayIdx: number, momentIdx: number) => {
    setDays((prev) => {
      const next = [...prev];
      next[dayIdx] = {
        ...next[dayIdx],
        moments: next[dayIdx].moments.filter((_, i) => i !== momentIdx),
      };
      return next;
    });
  };

  const handlePublish = () => {
    Alert.alert('Trip published! 🎉', 'Your trip is now visible to your followers.', [
      { text: 'Back to feed', onPress: () => router.push('/(tabs)/') },
    ]);
  };

  if (!sourceTrip || days.length === 0) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Trip not found</Text>
        <Btn sm onPress={() => router.back()}>Go back</Btn>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* toolbar */}
      <View style={styles.toolbar}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ back to journal</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <Text style={styles.tripName}>{sourceTrip.title}</Text>
        <Text style={styles.forkedFrom}>↳ forked from {sourceTrip.authorHandle}</Text>
        <View style={{ flex: 1 }} />
        {saved && <Chip dot={false}>✓ Saved</Chip>}
        <Btn sm onPress={() => setSaved(true)}>Save draft</Btn>
        <Btn solid sm onPress={handlePublish}>Publish trip</Btn>
      </View>

      {/* skim banner */}
      {isSkim && (
        <View style={styles.skimBanner}>
          <Text style={styles.skimBannerText}>
            ✦ Skimmed copy — spots, food & activities only. Add your own stays & flights.
          </Text>
        </View>
      )}

      <View style={styles.body}>
        {/* ── Left: day timeline ── */}
        <View style={styles.timelineCol}>
          {/* day tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabsRow}
          >
            {days.map((d, i) => (
              <TouchableOpacity key={d.n} onPress={() => setActiveDay(i)}>
                <View style={[styles.dayTab, i === activeDay && styles.dayTabActive]}>
                  <Text style={[styles.dayTabLabel, i === activeDay && styles.dayTabLabelActive]}>
                    D{d.n} · {d.place}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* day header */}
          {currentDay && (
            <View style={styles.currentDayHeader}>
              <View style={styles.dayCircle}>
                <Text style={styles.dayNum}>{currentDay.n}</Text>
              </View>
              <View>
                <Text style={styles.currentDayTitle}>Day {currentDay.n} — {currentDay.place}</Text>
                <Text style={styles.currentDaySub}>{currentDay.date} · {currentDay.moments.length} stops</Text>
              </View>
              <View style={{ flex: 1 }} />
              <Btn sm>＋ Add stop</Btn>
            </View>
          )}

          {/* stops timeline */}
          <ScrollView contentContainerStyle={styles.stopsContent}>
            {currentDay?.moments.map((m, mi) => (
              <View key={`${m.time}-${mi}`} style={styles.stopRow}>
                <View style={styles.railCol}>
                  <View style={[styles.railDot, mi === 0 && styles.railDotFirst]} />
                  {mi < currentDay.moments.length - 1 && <View style={styles.railLine} />}
                </View>
                <View style={{ flex: 1 }}>
                  <StopCard
                    moment={m}
                    index={mi}
                    onRemove={() => removeStop(activeDay, mi)}
                  />
                </View>
              </View>
            ))}

            {/* drop zone */}
            <View style={styles.dropZone}>
              <Text style={styles.dropZoneText}>＋ Drop a place, note or flight here</Text>
            </View>
          </ScrollView>
        </View>

        {/* ── Right: route map ── */}
        <View style={styles.mapCol}>
          <MapView initialLongitude={135.7681} initialLatitude={35.0116} initialZoom={12}>
            {currentDay?.moments.map((m, i) => (
              <MapPin
                key={m.time}
                x={PIN_POSITIONS[i % PIN_POSITIONS.length].x}
                y={PIN_POSITIONS[i % PIN_POSITIONS.length].y}
                label={i + 1}
                accent
                size={26}
              />
            ))}

            {/* route info */}
            <View style={styles.routeInfo}>
              <Text style={styles.routeInfoTitle}>Day {currentDay?.n} · {currentDay?.place}</Text>
              <Text style={styles.routeInfoSub}>
                {currentDay?.moments.length} stops · ~{(currentDay?.moments.length ?? 0) * 1.4 + 2.1 | 0} km
              </Text>
            </View>

            {/* search a place */}
            <TouchableOpacity style={styles.searchBar}>
              <Text style={styles.searchBarText}>⌕  Search a place to add to Day {currentDay?.n}</Text>
            </TouchableOpacity>
          </MapView>
        </View>
      </View>
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
  tripName: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  forkedFrom: { fontSize: fontSize.xs, color: colors.acc },

  body: { flex: 1, flexDirection: 'row' },

  timelineCol: {
    width: 440,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  dayTabsRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dayTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  dayTabActive: {
    backgroundColor: colors.accSoft,
    borderColor: colors.acc,
  },
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
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { color: colors.white, fontSize: fontSize.sm, fontWeight: '800' },
  currentDayTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  currentDaySub: { fontSize: fontSize.xs, color: colors.sub },

  stopsContent: { padding: spacing.lg, gap: 0 },

  stopRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  railCol: { width: 20, alignItems: 'center', paddingTop: 14 },
  railDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  railDotFirst: { borderColor: colors.acc, backgroundColor: colors.acc },
  railLine: { width: 2, flex: 1, backgroundColor: colors.line, marginTop: 2, minHeight: 20 },

  stopCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stopPhoto: {
    width: 72,
    height: 72,
    backgroundColor: colors.panel,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stopPhotoLabel: { fontSize: 10, color: colors.sub, fontFamily: 'monospace' },
  stopMeta: { flex: 1, gap: 4 },
  stopLocation: { fontSize: fontSize.sm, fontWeight: '700', color: colors.ink },
  stopTime: { alignSelf: 'flex-start' },
  stopCaption: { fontSize: fontSize.xs, color: colors.sub, lineHeight: 16 },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: fontSize.sm, color: colors.line },

  dropZone: {
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  dropZoneText: { fontSize: fontSize.sm, color: colors.sub },

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
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  routeInfoTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.ink },
  routeInfoSub: { fontSize: fontSize.xs, color: colors.sub },

  searchBar: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: 300,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchBarText: { fontSize: fontSize.md, color: colors.sub },
});

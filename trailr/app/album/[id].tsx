/**
 * Trip Album — two views:
 *   Grid    : GPS trail map + location-clustered photo grid (AlbumA)
 *   Scrapbook: two-page diary spread, paginated by day (JournalC)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, fontSize, radius } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { MapView, MapPin } from '../../src/components/MapView';
import { ScrapbookSpread } from '../../src/components/ScrapbookSpread';
import { getTripById } from '../../src/data/mockTrips';

type ViewMode = 'grid' | 'scrapbook';

// ── Grid clusters ────────────────────────────────────────────
function ClusterGrid({ moments }: { moments: Array<{ location: string; time: string; hasVideo?: boolean }> }) {
  const clusters = [
    {
      title: moments[0]?.location ?? 'Morning',
      time: moments[0]?.time ?? '',
      count: 4,
      hasVideo: false,
    },
    {
      title: moments[1]?.location ?? 'Afternoon',
      time: moments[1]?.time ?? '',
      count: 3,
      hasVideo: true,
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.gridContent}>
      {clusters.map((cluster, ci) => (
        <View key={ci} style={styles.cluster}>
          <View style={styles.clusterHeader}>
            <Text style={styles.clusterTitle}>{cluster.title}</Text>
            <Chip dot={false} style={styles.clusterTime}>{cluster.time}</Chip>
            <View style={{ flex: 1 }} />
            <TouchableOpacity>
              <Text style={styles.editCluster}>edit cluster</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photoGrid}>
            {Array.from({ length: cluster.count }).map((_, i) => (
              <TouchableOpacity key={i} style={styles.photoCell} activeOpacity={0.8}>
                <View style={styles.photoCellInner}>
                  {i === 0 && <Text style={styles.photoCellLabel}>[ photo ]</Text>}
                  {cluster.hasVideo && i === 1 && (
                    <View style={styles.videoOverlay}>
                      <Text style={styles.videoOverlayText}>▶ 0:18</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {/* add caption cell */}
            <TouchableOpacity style={[styles.photoCell, styles.addCaptionCell]}>
              <Text style={styles.addCaptionText}>＋ add{'\n'}caption</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function AlbumScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const trip = getTripById(id ?? 'trip-001');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentDay, setCurrentDay] = useState(0);

  const days = trip?.days ?? [];

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ back</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <Text style={styles.pageTitle}>Album</Text>
        {trip && (
          <Chip dot accent style={styles.photoCount}>
            {trip.photoCount} photos
          </Chip>
        )}
        <View style={{ flex: 1 }} />

        {/* view toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[styles.toggleLabel, viewMode === 'grid' && styles.toggleLabelActive]}>
              ▦ Grid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'scrapbook' && styles.toggleBtnActive]}
            onPress={() => setViewMode('scrapbook')}
          >
            <Text style={[styles.toggleLabel, viewMode === 'scrapbook' && styles.toggleLabelActive]}>
              ✦ Scrapbook
            </Text>
          </TouchableOpacity>
        </View>

        <Btn sm>Reorder</Btn>
        <Btn solid sm>Post album</Btn>
      </View>

      {/* ── Body ── */}
      {viewMode === 'grid' ? (
        <View style={styles.gridBody}>
          {/* GPS trail map */}
          <View style={styles.mapCol}>
            <MapView initialLongitude={135.7727} initialLatitude={34.9670} initialZoom={13}>
              <MapPin x="32%" y="30%" accent size={18} />
              <MapPin x="50%" y="48%" accent size={18} />
              <MapPin x="40%" y="66%" accent size={18} />
              <MapPin x="64%" y="58%" accent size={18} />
              <View style={styles.mapNote}>
                <Text style={styles.mapNoteText}>📍 matched to your route</Text>
              </View>
            </MapView>
          </View>

          {/* clustered grid */}
          <View style={styles.clusterCol}>
            {trip ? (
              <ClusterGrid moments={trip.days[0]?.moments ?? []} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No album data</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* ── Scrapbook view ── */
        <View style={styles.scrapbookBody}>
          {/* day selector strip */}
          <View style={styles.dayStrip}>
            <Text style={styles.dayStripLabel}>Days</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStripScroll}>
              {days.map((day, i) => (
                <TouchableOpacity
                  key={day.n}
                  onPress={() => setCurrentDay(i)}
                  style={[styles.dayStripItem, i === currentDay && styles.dayStripItemActive]}
                >
                  <Text style={[styles.dayStripNum, i === currentDay && styles.dayStripNumActive]}>
                    D{day.n}
                  </Text>
                  <Text style={styles.dayStripPlace} numberOfLines={1}>{day.place}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* spread */}
          {days[currentDay] && (
            <ScrapbookSpread
              day={days[currentDay]}
              dayIndex={currentDay}
              totalDays={days.length}
              onPrev={() => setCurrentDay((d) => Math.max(0, d - 1))}
              onNext={() => setCurrentDay((d) => Math.min(days.length - 1, d + 1))}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, flexDirection: 'column' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: colors.sub, fontSize: fontSize.sm },
  separator: { width: 1, height: 20, backgroundColor: colors.line, marginHorizontal: 4 },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.ink },
  photoCount: { marginLeft: 4 },

  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: colors.acc,
  },
  toggleLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.sub,
  },
  toggleLabelActive: {
    color: colors.white,
  },

  // grid view
  gridBody: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  mapCol: {
    width: 360,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    flexShrink: 0,
  },
  mapNote: {
    position: 'absolute',
    left: 14,
    top: 14,
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  mapNoteText: { fontSize: fontSize.xs },
  clusterCol: { flex: 1 },
  gridContent: { padding: spacing.xl, gap: spacing.xl },
  cluster: { gap: spacing.md },
  clusterHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clusterTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  clusterTime: {},
  editCluster: { fontSize: fontSize.sm, color: colors.sub },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: { width: '22%', aspectRatio: 1 },
  photoCellInner: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCellLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  videoOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(44,42,38,0.65)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  videoOverlayText: { fontSize: fontSize.xs, color: colors.white },
  addCaptionCell: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addCaptionText: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.sub, fontSize: fontSize.md },

  // scrapbook view
  scrapbookBody: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  dayStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
    backgroundColor: colors.paper,
  },
  dayStripLabel: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '600' },
  dayStripScroll: { gap: spacing.sm },
  dayStripItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  dayStripItemActive: {
    backgroundColor: colors.accSoft,
    borderColor: colors.acc,
  },
  dayStripNum: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.sub,
  },
  dayStripNumActive: { color: colors.acc },
  dayStripPlace: {
    fontSize: fontSize.xs,
    color: colors.sub,
    maxWidth: 70,
  },
});

/**
 * Explore screen â€” FeedC: masonry photo grid + right context rail
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicStops, useToggleSave } from '@trailr/db';
import type { FeedStop } from '@trailr/db';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { Chip } from '../../src/components/Chip';
import { Avatar } from '../../src/components/Avatar';
import { Btn } from '../../src/components/Btn';
import { CoverImage } from '../../src/components/CoverImage';
import { MapView } from '../../src/components/MapView';
import { useAuthStore } from '../../src/stores/authStore';

const CATEGORIES = ['Trending', 'Thailand', 'Japan', 'Food', 'Hidden gems'];

function matchCategory(stop: FeedStop, cat: string): boolean {
  if (cat === 'Trending' || cat === 'Hidden gems') return true;
  if (cat === 'Food') return stop.category === 'food';
  const hay = `${stop.location_name ?? ''} ${stop.trip?.title ?? ''}`.toLowerCase();
  return hay.includes(cat.toLowerCase());
}

function photoUri(stop: FeedStop): string | undefined {
  return stop.media?.[0]?.cdn_url ?? stop.media?.[0]?.url;
}

export default function ExploreScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('Trending');
  const { data: stops = [], isLoading } = useQuery({
    queryKey: ['explore', 'discover'],
    queryFn: () => fetchPublicStops(60),
    staleTime: 1000 * 60,
  });
  const [selected, setSelected] = useState<FeedStop | null>(null);
  const user = useAuthStore((s) => s.user);
  const toggleSave = useToggleSave();

  const items = stops.filter((s) => matchCategory(s, activeCategory));
  const active = selected ?? items[0];

  const onSave = () => {
    if (!user) { router.push('/sign-in'); return; }
    if (active) toggleSave.mutate({ stop_id: active.id });
  };

  return (
    <View style={styles.root}>
      <TopBar
        active="Explore"
        onTabPress={(tab) => {
          if (tab === 'Feed') router.push('/(tabs)/');
          if (tab === 'Trips') router.push('/(tabs)/trips');
          if (tab === 'Saved') router.push('/(tabs)/saved');
        }}
      />
      <View style={styles.body}>
        {/* Center: masonry grid */}
        <ScrollView style={styles.gridCol} contentContainerStyle={styles.gridContent}>
          <View style={styles.categories}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c} onPress={() => setActiveCategory(c)}>
                <Chip dot={false} accent={c === activeCategory}>{c}</Chip>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <View style={styles.loading}><ActivityIndicator color={colors.acc} size="large" /></View>
          ) : items.length === 0 ? (
            <View style={styles.loading}><Text style={styles.gridLabel}>Nothing here yet.</Text></View>
          ) : (
            <View style={styles.grid}>
              {items.map((stop, i) => {
                const uri = photoUri(stop);
                return (
                  <TouchableOpacity
                    key={stop.id}
                    style={[styles.gridItem, i % 7 === 0 && styles.gridItemSpan]}
                    activeOpacity={0.8}
                    onPress={() => setSelected(stop)}
                  >
                    <View style={styles.gridPhoto}>
                      <CoverImage uri={uri} style={styles.gridPhotoImg} labelStyle={styles.gridLabel} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Right: context rail (selected post) */}
        <View style={styles.rail}>
          <View style={styles.railAuthor}>
            <Avatar size={36} ring />
            <View style={styles.railAuthorMeta}>
              <Text style={styles.railHandle}>@{active?.author?.username ?? '—'}</Text>
              <Text style={styles.railLoc}>{active?.location_name ?? 'Pick a photo'}</Text>
            </View>
          </View>
          <View style={styles.selectedPhoto}>
            <CoverImage
              uri={active ? photoUri(active) : undefined}
              style={styles.selectedPhotoImg}
              labelStyle={styles.photoLabel}
              label="selected post"
            />
          </View>
          <View style={styles.miniMapWrap}>
            <MapView
              initialLatitude={active?.latitude ?? 13.7457}
              initialLongitude={active?.longitude ?? 100.4888}
              initialZoom={12}
              center={
                active && active.latitude != null && active.longitude != null
                  ? { latitude: active.latitude, longitude: active.longitude }
                  : null
              }
              posts={
                active && active.latitude != null && active.longitude != null
                  ? [{ id: active.id, latitude: active.latitude, longitude: active.longitude, location: active.location_name ?? '', caption: active.caption ?? '' }]
                  : []
              }
              style={{ height: 130 }}
            />
          </View>
          <Btn full sm onPress={onSave}>{active?.is_saved ? '🔖 Saved' : '🔖 Save'}</Btn>
          <Btn solid full sm onPress={() => active && router.push(`/journal/${active.trip?.id ?? active.trip_id}`)}>
            View trip
          </Btn>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, flexDirection: 'row' },
  gridCol: { flex: 1 },
  gridContent: { padding: spacing.xl, gap: spacing.md },
  categories: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridItemSpan: {
    width: '48%',
    aspectRatio: 1,
  },
  gridPhoto: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  gridPhotoImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  selectedPhotoImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8 },
  loading: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
  railHandle: { fontSize: fontSize.md, fontWeight: '700', color: colors.ink },
  railLoc: { fontSize: fontSize.sm, color: colors.sub, marginTop: 2 },
  rail: {
    width: 360,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    backgroundColor: colors.panel,
    padding: spacing.lg + 2,
    gap: spacing.md,
  },
  railAuthor: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  railAuthorMeta: { flex: 1 },
  bar: { height: 9, backgroundColor: colors.bar, borderRadius: 5 },
  selectedPhoto: {
    height: 200,
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: { fontSize: fontSize.sm, color: colors.sub, fontFamily: 'monospace' },
  miniMapWrap: { height: 130, borderRadius: 8, overflow: 'hidden' },
  nearByTitle: { fontSize: fontSize.md, color: colors.sub },
  nearByRow: { flexDirection: 'row', gap: 8 },
  nearByThumb: { flex: 1, height: 64, backgroundColor: colors.paper, borderRadius: 6, borderWidth: 1, borderColor: colors.line },
});


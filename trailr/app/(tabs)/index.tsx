/**
 * Feed screen — FeedA: split feed + live map
 * Reads live data from Supabase via useFeedStops.
 * Falls back to public trips when not signed in.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { MapView } from '../../src/components/MapView';
import { Chip } from '../../src/components/Chip';
import { Avatar } from '../../src/components/Avatar';
import { CoverImage } from '../../src/components/CoverImage';
import { CommentsModal } from '../../src/components/CommentsModal';
import { MapSheet } from '../../src/components/MapSheet';
import { FeedCardSkeleton } from '../../src/components/Skeleton';
import { useResponsive } from '../../src/hooks/useResponsive';
import { useAuthStore } from '../../src/stores/authStore';
import { fetchFeedStops, fetchPublicStops, useToggleSave, useToggleLike, stopKeys } from '@trailr/db';
import { useToast } from '../../src/components/Toast';
import { PressableScale } from '../../src/components/PressableScale';
import { Btn } from '../../src/components/Btn';

const FILTERS = ['Following', 'Nearby', 'For you', 'On-map'];

// Feed query functions now live in @trailr/db (REST API client).

// ── Feed card ────────────────────────────────────────────────
function FeedCard({ stop, onPress, onToggleLike, onToggleSave, onOpenComments }: { stop: any; onPress: () => void; onToggleLike: () => void; onToggleSave: () => void; onOpenComments: () => void }) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Avatar size={38} ring imageUri={stop.author?.avatar_url} />
        <View style={styles.cardUserInfo}>
          <Text style={styles.cardHandle}>
            @{stop.author?.username ?? 'unknown'}
          </Text>
          <Chip dot accent style={styles.locationChip}>
            {stop.location_name ?? 'Unknown location'}
          </Chip>
        </View>
      </View>

      <View style={styles.cardPhoto}>
        <CoverImage
          uri={stop.media?.[0]?.cdn_url ?? stop.media?.[0]?.url}
          style={styles.cardPhotoImg}
          labelStyle={styles.photoLabel}
        />
        {stop.trip && (
          <View style={styles.tripBadge}>
            <Text style={styles.tripBadgeText}>✈ {stop.trip.title}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <PressableScale onPress={onToggleLike} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={stop.is_liked ? 'Unlike' : 'Like'}>
          <Text style={[styles.actionIcon, stop.is_liked && styles.likedIcon]}>{stop.is_liked ? '♥' : '♡'}</Text>
          <Text style={styles.actionCount}>{stop.like_count ?? 0}</Text>
        </PressableScale>
        <PressableScale onPress={onToggleSave} style={styles.actionBtn} accessibilityRole="button" accessibilityLabel={stop.is_saved ? 'Remove from saved' : 'Save'}>
          <Text style={[styles.actionIcon, stop.is_saved && styles.likedIcon]}>
            {stop.is_saved ? '🔖' : '▢'}
          </Text>
        </PressableScale>
        <View style={{ flex: 1 }} />
        <PressableScale onPress={onOpenComments} accessibilityRole="button" accessibilityLabel="Comments">
          <Text style={styles.actionCount}>{stop.comment_count ?? 0} comments</Text>
        </PressableScale>
      </View>

      <View style={styles.cardCaption}>
        <Text style={styles.cardCaptionText} numberOfLines={3}>
          {stop.caption ?? ''}
        </Text>
      </View>

      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>View full trip journal →</Text>
      </View>
    </Pressable>
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function FeedScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState('Following');
  const toggleSave = useToggleSave();
  const toggleLike = useToggleLike(user?.id ?? '');
  const toast = useToast();
  const [commentsStop, setCommentsStop] = useState<string | null>(null);
  const { isPhone } = useResponsive();
  // Visible map bounds → drives the "On-map" filter.
  const [mapBounds, setMapBounds] = useState<
    { west: number; south: number; east: number; north: number } | null
  >(null);

  const onToggleSave = (stop: any) => {
    if (!user) { router.push('/sign-in'); return; }
    toggleSave.mutate({ stop_id: stop.id });
    toast(stop.is_saved ? 'Removed from saved' : 'Saved');
  };

  const onToggleLike = (stopId: string) => {
    if (!user) { router.push('/sign-in'); return; }
    toggleLike.mutate(stopId);
  };

  // Fetch following feed if signed in, else public stops.
  // Signed-in key matches stopKeys.feed so useToggleLike's optimistic update lands here.
  const { data: stops = [], isLoading, error, refetch } = useQuery({
    queryKey: user ? stopKeys.feed(user.id) : ['feed', 'public'],
    queryFn: () => user ? fetchFeedStops(user.id) : fetchPublicStops(),
    staleTime: 1000 * 30,
    retry: 1,
  });

  if (error) console.error('[Feed] query error:', error);

  // Map pins from live stops
  const pins = stops
    .filter((s: any) => s.latitude && s.longitude)
    .map((s: any) => ({
      id: s.id,
      latitude: s.latitude,
      longitude: s.longitude,
      location: s.location_name ?? '',
      caption: s.caption ?? '',
      hasVideo: s.media?.some((m: any) => m.type === 'video'),
      onPress: () => router.push(`/journal/${s.trip?.id ?? s.trip_id}`),
    }));

  // "On-map": only posts whose location falls inside the current map viewport.
  const onMap = activeFilter === 'On-map';
  const displayedStops =
    onMap && mapBounds
      ? stops.filter(
          (s: any) =>
            s.latitude != null &&
            s.longitude != null &&
            s.longitude >= mapBounds.west &&
            s.longitude <= mapBounds.east &&
            s.latitude >= mapBounds.south &&
            s.latitude <= mapBounds.north,
        )
      : stops;

  const feedInner = (
    <>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <PressableScale key={f} onPress={() => setActiveFilter(f)}>
            <Chip dot={false} accent={f === activeFilter}>{f}</Chip>
          </PressableScale>
        ))}
      </View>

      {isLoading || authLoading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.feedScroll, isPhone && styles.feedScrollPhone]}
        >
          {[0, 1, 2].map((i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </ScrollView>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Couldn't load your feed.</Text>
          <Text style={[styles.emptyText, { fontSize: fontSize.sm, marginTop: 6, marginBottom: spacing.lg }]}>
            Check your connection and try again.
          </Text>
          <Btn sm onPress={() => refetch()}>Retry</Btn>
        </View>
      ) : displayedStops.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {onMap
              ? 'No posts in this part of the map — pan or zoom out.'
              : user
                ? 'Follow someone to see their trips here.'
                : 'Seed not run yet — 0 stops in DB.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.feedScroll, isPhone && styles.feedScrollPhone]}
        >
          {displayedStops.map((stop: any) => (
            <FeedCard
              key={stop.id}
              stop={stop}
              onToggleLike={() => onToggleLike(stop.id)}
              onToggleSave={() => onToggleSave(stop)}
              onOpenComments={() => setCommentsStop(stop.id)}
              onPress={() => router.push(`/journal/${stop.trip?.id ?? stop.trip_id}`)}
            />
          ))}
        </ScrollView>
      )}
    </>
  );

  const mapBlock = (
    <MapView
      initialLongitude={136.0}
      initialLatitude={30.0}
      initialZoom={4}
      posts={pins}
      onBoundsChange={setMapBounds}
    >
      <View style={styles.liveBadge} pointerEvents={'none'}>
        <View style={styles.liveDot} />
        <Text style={styles.liveBadgeText}>
          {onMap ? `${displayedStops.length} in view` : `${pins.length} stops on map`}
        </Text>
      </View>
    </MapView>
  );

  return (
    <View style={styles.root}>
      <TopBar
        active="Feed"
        onTabPress={(tab) => {
          if (tab === 'Explore') router.push('/(tabs)/explore');
          if (tab === 'Trips') router.push('/(tabs)/trips');
          if (tab === 'Saved') router.push('/(tabs)/saved');
        }}
      />
      {isPhone ? (
        <View style={styles.phoneBody}>
          <View style={styles.feedColPhone}>{feedInner}</View>
          <MapSheet title={`🗺  Map · ${pins.length} stops`}>{mapBlock}</MapSheet>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.feedCol}>{feedInner}</View>
          <View style={styles.mapCol}>{mapBlock}</View>
        </View>
      )}

      <CommentsModal
        stopId={commentsStop}
        visible={!!commentsStop}
        onClose={() => setCommentsStop(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, flexDirection: 'row' },
  feedCol: {
    width: 520,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    flexShrink: 0,
  },
  // phone: feed fills the width; the map lives in a MapSheet over it
  phoneBody: { flex: 1 },
  feedColPhone: { flex: 1 },
  feedScrollPhone: { paddingBottom: 200 }, // clear the collapsed map sheet + tab bar
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  feedScroll: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: fontSize.md, color: colors.sub, textAlign: 'center' },

  card: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.92, borderColor: colors.acc },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardUserInfo: { flex: 1, gap: 4 },
  cardHandle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.ink },
  locationChip: { alignSelf: 'flex-start' },

  cardPhoto: {
    height: 200,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photoLabel: { fontSize: fontSize.sm, color: colors.sub, fontFamily: 'monospace' },
  cardPhotoImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tripBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(251,249,245,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tripBadgeText: { fontSize: fontSize.xs, color: colors.sub },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 20, color: colors.ink },
  likedIcon: { color: colors.acc },
  actionCount: { fontSize: fontSize.sm, color: colors.sub },

  cardCaption: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  cardCaptionText: { fontSize: fontSize.sm, color: colors.ink, lineHeight: 20 },

  tapHint: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  tapHintText: { fontSize: fontSize.xs, color: colors.acc, fontWeight: '600' },

  mapCol: { flex: 1, position: 'relative' },
  liveBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.acc },
  liveBadgeText: { fontSize: fontSize.sm, color: colors.ink },
});

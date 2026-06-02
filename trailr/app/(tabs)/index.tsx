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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { MapView } from '../../src/components/MapView';
import { Chip } from '../../src/components/Chip';
import { Avatar } from '../../src/components/Avatar';
import { useAuthStore } from '../../src/stores/authStore';
import { getSupabaseClient } from '@trailr/db';
import type { FeedStop, StopWithMedia } from '@trailr/db';

const FILTERS = ['Following', 'Nearby', 'For you'];

// ── Fetch functions ──────────────────────────────────────────
async function fetchFollowingFeedStops(userId: string): Promise<FeedStop[]> {
  const db = getSupabaseClient() as any;

  const { data: follows } = await db
    .from('follows').select('following_id').eq('follower_id', userId);
  const ids = (follows ?? []).map((f: any) => f.following_id as string);
  if (ids.length === 0) return [];

  const { data, error } = await db
    .from('stops')
    .select(`*, media(*), author:users!stops_user_id_fkey(id,username,display_name,avatar_url), trip:trips!stops_trip_id_fkey(id,title,cover_image_url)`)
    .eq('status', 'visited')
    .in('user_id', ids)
    .order('captured_at', { ascending: false })
    .limit(30);
  if (error) throw error;

  const stopIds = (data ?? []).map((s: any) => s.id as string);
  const { data: likes } = await db.from('likes').select('stop_id').eq('user_id', userId).in('stop_id', stopIds);
  const likedSet = new Set((likes ?? []).map((l: any) => l.stop_id));

  return (data ?? []).map((s: any) => ({ ...s, is_liked: likedSet.has(s.id), is_saved: false }));
}

async function fetchPublicStops(): Promise<StopWithMedia[]> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('stops')
    .select(`*, media(*), author:users!stops_user_id_fkey(id,username,display_name,avatar_url), trip:trips!stops_trip_id_fkey(id,title,cover_image_url)`)
    .eq('status', 'visited')
    .order('captured_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

// ── Feed card ────────────────────────────────────────────────
function FeedCard({ stop, onPress }: { stop: any; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Avatar size={38} ring />
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
        <Text style={styles.photoLabel}>[ photo ]</Text>
        {stop.trip && (
          <View style={styles.tripBadge}>
            <Text style={styles.tripBadgeText}>✈ {stop.trip.title}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <Text style={[styles.actionIcon, stop.is_liked && styles.likedIcon]}>♡</Text>
        <Text style={styles.actionCount}>{stop.like_count ?? 0}</Text>
        <Text style={styles.actionIcon}>▢</Text>
        <Text style={styles.actionIcon}>↗</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.actionCount}>{stop.comment_count ?? 0} comments</Text>
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

  // Fetch following feed if signed in, else public stops
  const { data: stops = [], isLoading } = useQuery({
    queryKey: user ? ['feed', 'following', user.id] : ['feed', 'public'],
    queryFn: () => user ? fetchFollowingFeedStops(user.id) : fetchPublicStops(),
    staleTime: 1000 * 30,
  });

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
      <View style={styles.body}>
        {/* ── Left: feed ── */}
        <View style={styles.feedCol}>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f} onPress={() => setActiveFilter(f)}>
                <Chip dot={false} accent={f === activeFilter}>{f}</Chip>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading || authLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.acc} size="large" />
            </View>
          ) : stops.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {user ? 'Follow someone to see their trips here.' : 'No trips yet.'}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.feedScroll}
            >
              {stops.map((stop: any) => (
                <FeedCard
                  key={stop.id}
                  stop={stop}
                  onPress={() => router.push(`/journal/${stop.trip?.id ?? stop.trip_id}`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Right: live interactive map ── */}
        <View style={styles.mapCol}>
          <MapView
            initialLongitude={136.0}
            initialLatitude={30.0}
            initialZoom={4}
            posts={pins}
          >
            <View style={styles.liveBadge} pointerEvents={'none'}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>
                {pins.length} stops on map
              </Text>
            </View>
          </MapView>
        </View>
      </View>
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

/**
 * Feed screen â€” FeedA: split feed + live map
 * Real mock data, tap post â†’ Journal
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
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { MapView } from '../../src/components/MapView';
import { Chip } from '../../src/components/Chip';
import { Avatar } from '../../src/components/Avatar';
import { MOCK_TRIPS, Trip, getAllMoments } from '../../src/data/mockTrips';

const FILTERS = ['Following', 'Nearby', 'For you'];

// All moments from all trips as map pins
function useFeedPins(router: ReturnType<typeof useRouter>) {
  return getAllMoments().map((m) => ({
    id: `${m.tripId}-${m.longitude}-${m.latitude}`,
    latitude: m.latitude,
    longitude: m.longitude,
    location: m.location,
    caption: m.caption,
    hasVideo: m.hasVideo,
    onPress: () => router.push(`/journal/${m.tripId}`),
  }));
}

function FeedCard({ trip, index, onPress }: { trip: Trip; index: number; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.card, pressed && styles.cardPressed]}
    >
      {/* header */}
      <View style={styles.cardHeader}>
        <Avatar size={38} ring />
        <View style={styles.cardUserInfo}>
          <Text style={styles.cardHandle}>{trip.authorHandle}</Text>
          <Chip dot accent style={styles.locationChip}>
            {trip.coverLocation}
          </Chip>
        </View>
        <View style={styles.pinBadge}>
          <Text style={styles.pinNum}>{index + 1}</Text>
        </View>
      </View>

      {/* photo */}
      <View style={styles.cardPhoto}>
        <Text style={styles.photoLabel}>[ trip photo ]</Text>
        {trip.forkedFrom && (
          <View style={styles.forkBadge}>
            <Text style={styles.forkBadgeText}>â‘‚ based on {trip.forkedFrom}</Text>
          </View>
        )}
      </View>

      {/* actions */}
      <View style={styles.cardActions}>
        <Text style={styles.actionIcon}>â™¡</Text>
        <Text style={styles.actionCount}>{trip.likeCount.toLocaleString()}</Text>
        <Text style={styles.actionIcon}>â–¢</Text>
        <Text style={styles.actionIcon}>â†—</Text>
        <View style={{ flex: 1 }} />
        <Chip dot={false}>â‘‚ {trip.forkCount} forks</Chip>
      </View>

      {/* caption */}
      <View style={styles.cardCaption}>
        <Text style={styles.cardTitle} numberOfLines={1}>{trip.title}</Text>
        <Text style={styles.cardSub} numberOfLines={2}>
          {trip.days[0].moments[0].caption}
        </Text>
      </View>

      {/* tap hint */}
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>View full trip journal â†’</Text>
      </View>
    </Pressable>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('Following');
  const pins = useFeedPins(router);

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
        {/* â”€â”€ Left: feed column â”€â”€ */}
        <View style={styles.feedCol}>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f} onPress={() => setActiveFilter(f)}>
                <Chip dot={false} accent={f === activeFilter}>{f}</Chip>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feedScroll}
          >
            {MOCK_TRIPS.map((trip, i) => (
              <FeedCard
                key={trip.id}
                trip={trip}
                index={i}
                onPress={() => router.push(`/journal/${trip.id}`)}
              />
            ))}
          </ScrollView>
        </View>

        {/* â”€â”€ Right: live interactive map â”€â”€ */}
        <View style={styles.mapCol}>
          <MapView
            initialLongitude={136.0}
            initialLatitude={30.0}
            initialZoom={4}
            posts={pins}
          >
            {/* live badge overlay */}
            <View style={styles.liveBadge} pointerEvents={'none'}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>{pins.length} posts on map</Text>
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
  feedScroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  card: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    gap: 0,
  },
  cardPressed: {
    opacity: 0.92,
    borderColor: colors.acc,
  },
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
  pinBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinNum: { fontSize: fontSize.xs, fontWeight: '700', color: colors.sub },

  cardPhoto: {
    height: 200,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photoLabel: { fontSize: fontSize.sm, color: colors.sub, fontFamily: 'monospace' },
  forkBadge: {
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
  forkBadgeText: { fontSize: fontSize.xs, color: colors.sub },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  actionIcon: { fontSize: 20, color: colors.ink },
  actionCount: { fontSize: fontSize.sm, color: colors.sub },

  cardCaption: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  cardTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.ink },
  cardSub: { fontSize: fontSize.sm, color: colors.sub, lineHeight: 18 },

  tapHint: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  tapHintText: { fontSize: fontSize.xs, color: colors.acc, fontWeight: '600' },

  mapCol: { flex: 1, position: 'relative' },

  miniPreview: {
    position: 'absolute',
    left: '42%',
    top: '12%',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.paper,
    padding: 8,
    width: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  miniPhoto: {
    width: 44,
    height: 44,
    backgroundColor: colors.panel,
    borderRadius: 6,
  },
  miniMeta: { flex: 1, justifyContent: 'center', gap: 4 },
  miniTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.ink },
  miniSub: { fontSize: fontSize.xs, color: colors.sub },

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
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.acc },
  liveBadgeText: { fontSize: fontSize.sm, color: colors.ink },
});


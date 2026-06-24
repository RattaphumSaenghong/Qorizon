import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSearch } from '@trailr/db';
import type { UserSearchResult, TripSearchResult } from '@trailr/db';
import { colors, fontSize, spacing, radius, shadow } from '../theme/tokens';
import { tripHref } from '../lib/tripHref';
import { usePlaceSuggestions } from '../hooks/usePlaceSuggestions';
import type { PlaceSuggestion } from '../lib/places';

const STAGE_LABEL: Record<string, string> = {
  planning: 'Planning',
  living: 'Living',
  album: 'Album',
};

interface Props {
  query: string;
  onPick: () => void;
}

export function SearchOverlay({ query, onPick }: Props) {
  const router = useRouter();
  const { data, isLoading } = useSearch(query);
  const { suggestions: places, resolve } = usePlaceSuggestions(query);

  const users = data?.users ?? [];
  const trips = data?.trips ?? [];
  const hasResults = users.length > 0 || trips.length > 0 || places.length > 0;

  const goUser = (u: UserSearchResult) => {
    onPick();
    router.push(`/profile/${u.username}`);
  };

  const goTrip = (t: TripSearchResult) => {
    onPick();
    router.push(tripHref(t));
  };

  const goPlace = async (p: PlaceSuggestion) => {
    const coord = await resolve(p);
    onPick();
    if (coord) router.push(`/(tabs)/explore?lat=${coord.latitude}&lng=${coord.longitude}`);
  };

  const goAll = () => {
    onPick();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <View style={styles.overlay}>
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.acc} size="small" />
        </View>
      )}

      {!isLoading && !hasResults && (
        <View style={styles.center}>
          <Text style={styles.empty}>No results for "{query}"</Text>
        </View>
      )}

      {!isLoading && users.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>People</Text>
          {users.map((u) => (
            <TouchableOpacity key={u.id} style={styles.row} onPress={() => goUser(u)}>
              <View style={styles.avatarSmall}>
                {u.avatar_url ? (
                  <Image source={{ uri: u.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarFallback}>{(u.display_name ?? u.username)[0]}</Text>
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{u.display_name ?? u.username}</Text>
                <Text style={styles.rowSub}>@{u.username}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!isLoading && trips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Trips</Text>
          {trips.map((t) => (
            <TouchableOpacity key={t.id} style={styles.row} onPress={() => goTrip(t)}>
              <View style={styles.tripThumb}>
                {t.cover_image_url ? (
                  <Image source={{ uri: t.cover_image_url }} style={styles.tripImg} />
                ) : (
                  <Text style={styles.tripFallback}>✈</Text>
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {[t.destination, STAGE_LABEL[t.stage]].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {places.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Places</Text>
          {places.map((p) => (
            <TouchableOpacity key={p.mapbox_id} style={styles.row} onPress={() => goPlace(p)}>
              <View style={styles.placePin}>
                <Text style={styles.placePinText}>📍</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{p.name}</Text>
                {p.place_formatted ? (
                  <Text style={styles.rowSub} numberOfLines={1}>{p.place_formatted}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {hasResults && (
        <TouchableOpacity style={styles.seeAll} onPress={goAll}>
          <Text style={styles.seeAllText}>See all results for "{query}"</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    minWidth: 320,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
    zIndex: 300,
    overflow: 'hidden',
  },
  center: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  empty: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.sub,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarImg: {
    width: 32,
    height: 32,
  },
  avatarFallback: {
    fontSize: fontSize.md,
    color: colors.sub,
    fontWeight: '600',
  },
  tripThumb: {
    width: 40,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tripImg: {
    width: 40,
    height: 32,
  },
  tripFallback: {
    fontSize: 16,
  },
  placePin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placePinText: {
    fontSize: 15,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: fontSize.sm,
    color: colors.sub,
  },
  seeAll: {
    padding: spacing.md,
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: fontSize.sm,
    color: colors.acc,
    fontWeight: '600',
  },
});

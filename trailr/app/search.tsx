/**
 * Full-screen search — opened from TopBar Enter (desktop) or phone search button.
 * Shows all results across people and trips with per-tab filtered views.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSearchUsers, useSearchTrips } from '@trailr/db';
import type { UserSearchResult, TripSearchResult } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../src/theme/tokens';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { usePlaceSuggestions } from '../src/hooks/usePlaceSuggestions';
import type { PlaceSuggestion } from '../src/lib/places';
import { tripHref } from '../src/lib/tripHref';

type Tab = 'all' | 'people' | 'trips' | 'places';

const STAGE_LABEL: Record<string, string> = {
  planning: 'Planning',
  living: 'Living',
  album: 'Album',
};

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [rawQuery, setRawQuery] = useState(params.q ?? '');
  const [tab, setTab] = useState<Tab>('all');
  const debouncedQ = useDebouncedValue(rawQuery, 250);

  const { data: users = [], isLoading: loadingUsers } = useSearchUsers(debouncedQ);
  const { data: trips = [], isLoading: loadingTrips } = useSearchTrips(debouncedQ);
  const { suggestions: places, resolve } = usePlaceSuggestions(debouncedQ);

  const isLoading = loadingUsers || loadingTrips;
  const hasQuery = debouncedQ.trim().length >= 2;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const visibleUsers = tab === 'all' || tab === 'people' ? users : [];
  const visibleTrips = tab === 'all' || tab === 'trips' ? trips : [];
  const visiblePlaces = tab === 'all' || tab === 'places' ? places : [];
  const hasResults = visibleUsers.length > 0 || visibleTrips.length > 0 || visiblePlaces.length > 0;

  const goPlace = async (p: PlaceSuggestion) => {
    const coord = await resolve(p);
    if (coord) router.push(`/(tabs)/explore?lat=${coord.latitude}&lng=${coord.longitude}`);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>⌕</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search places, trips, people"
            placeholderTextColor={colors.sub}
            value={rawQuery}
            onChangeText={setRawQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all', 'people', 'trips', 'places'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t[0].toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {isLoading && hasQuery && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.acc} />
          </View>
        )}

        {!isLoading && hasQuery && !hasResults && (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>No results for "{debouncedQ}"</Text>
            <Text style={styles.emptySub}>Try a different spelling or search for something else.</Text>
          </View>
        )}

        {!hasQuery && (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyTitle}>Search Trailr</Text>
            <Text style={styles.emptySub}>Find people, trips, and places.</Text>
          </View>
        )}

        {visibleUsers.length > 0 && (
          <Section label="People">
            {visibleUsers.map((u) => (
              <PersonRow key={u.id} user={u} onPress={() => router.push(`/profile/${u.username}`)} />
            ))}
          </Section>
        )}

        {visibleTrips.length > 0 && (
          <Section label="Trips">
            {visibleTrips.map((t) => (
              <TripRow key={t.id} trip={t} onPress={() => router.push(tripHref(t))} />
            ))}
          </Section>
        )}

        {visiblePlaces.length > 0 && (
          <Section label="Places">
            {visiblePlaces.map((p) => (
              <PlaceRow key={p.mapbox_id} place={p} onPress={() => goPlace(p)} />
            ))}
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

function PersonRow({ user, onPress }: { user: UserSearchResult; onPress: () => void }) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress}>
      <View style={rowStyles.avatar}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={rowStyles.avatarImg} />
        ) : (
          <Text style={rowStyles.avatarFallback}>{(user.display_name ?? user.username)[0]}</Text>
        )}
      </View>
      <View style={rowStyles.text}>
        <Text style={rowStyles.title}>{user.display_name ?? user.username}</Text>
        <Text style={rowStyles.sub}>@{user.username}</Text>
      </View>
    </TouchableOpacity>
  );
}

function TripRow({ trip, onPress }: { trip: TripSearchResult; onPress: () => void }) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress}>
      <View style={rowStyles.tripThumb}>
        {trip.cover_image_url ? (
          <Image source={{ uri: trip.cover_image_url }} style={rowStyles.tripImg} />
        ) : (
          <Text style={rowStyles.tripFallback}>✈</Text>
        )}
      </View>
      <View style={rowStyles.text}>
        <Text style={rowStyles.title} numberOfLines={1}>{trip.title}</Text>
        <Text style={rowStyles.sub} numberOfLines={1}>
          {[trip.destination, STAGE_LABEL[trip.stage]].filter(Boolean).join(' · ')} · by @{trip.author.username}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function PlaceRow({ place, onPress }: { place: PlaceSuggestion; onPress: () => void }) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress}>
      <View style={rowStyles.placePin}>
        <Text style={rowStyles.placePinText}>📍</Text>
      </View>
      <View style={rowStyles.text}>
        <Text style={rowStyles.title} numberOfLines={1}>{place.name}</Text>
        {place.place_formatted ? (
          <Text style={rowStyles.sub} numberOfLines={1}>{place.place_formatted}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: spacing.sm,
  },
  back: { padding: 4 },
  backText: { fontSize: 22, color: colors.ink },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    gap: 6,
    height: 40,
  },
  inputIcon: { fontSize: fontSize.md, color: colors.sub },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.ink,
    outlineStyle: 'none',
  } as object,
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: spacing.lg,
  },
  tabItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.acc,
  },
  tabText: {
    fontSize: fontSize.md,
    color: colors.sub,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  list: { flex: 1 },
  listContent: { paddingVertical: spacing.sm },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 36, color: colors.sub },
  emptyTitle: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '600' },
  emptySub: { fontSize: fontSize.md, color: colors.sub, textAlign: 'center', maxWidth: 280 },
});

const sectionStyles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.sub,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarImg: { width: 44, height: 44 },
  avatarFallback: { fontSize: fontSize.lg, color: colors.sub, fontWeight: '600' },
  tripThumb: {
    width: 56,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tripImg: { width: 56, height: 44 },
  tripFallback: { fontSize: 20 },
  placePin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placePinText: { fontSize: 20 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.md, color: colors.ink, fontWeight: '600' },
  sub: { fontSize: fontSize.sm, color: colors.sub },
});

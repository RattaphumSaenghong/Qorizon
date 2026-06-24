/**
 * Saved tab — the user's bookmarked stops & trips.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSaved, useUnsaveItem } from '@trailr/db';
import type { SavedItem } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { Btn } from '../../src/components/Btn';
import { Chip } from '../../src/components/Chip';
import { CoverImage } from '../../src/components/CoverImage';
import type { ViewStyle } from 'react-native';
import { useAuthStore } from '../../src/stores/authStore';
import { useResponsive } from '../../src/hooks/useResponsive';

function SavedCard({ item, onOpen, onRemove, cardStyle }: { item: SavedItem; onOpen: () => void; onRemove: () => void; cardStyle?: ViewStyle }) {
  const isTrip = !!item.trip;
  const title = isTrip ? item.trip!.title : item.stop!.location_name ?? 'Saved stop';
  const subtitle = isTrip
    ? `@${item.trip!.author.username} · trip`
    : `@${item.stop!.author.username} · ${item.stop!.caption ?? ''}`;
  const uri = isTrip
    ? item.trip!.cover_image_url ?? undefined
    : item.stop!.media?.[0]?.cdn_url ?? item.stop!.media?.[0]?.url;

  return (
    <TouchableOpacity style={[styles.card, cardStyle]} onPress={onOpen} activeOpacity={0.88}>
      <View style={styles.cover}>
        <CoverImage
          uri={uri}
          style={styles.coverImg}
          labelStyle={styles.coverLabel}
          label={isTrip ? 'cover' : 'photo'}
        />
        <Chip dot={false} accent style={styles.kind}>{isTrip ? '✈ Trip' : '◷ Stop'}</Chip>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SavedScreen() {
  const router = useRouter();
  const { isPhone } = useResponsive();
  const user = useAuthStore((s) => s.user);
  const { data: items = [], isLoading } = useSaved();
  const unsave = useUnsaveItem();

  const goTab = (tab: string) => {
    if (tab === 'Feed') router.push('/(tabs)/');
    if (tab === 'Explore') router.push('/(tabs)/explore');
    if (tab === 'Trips') router.push('/(tabs)/trips');
  };

  const openItem = (item: SavedItem) => {
    const tripId = item.trip?.id ?? item.stop?.trip_id;
    if (tripId) router.push(`/journal/${tripId}`);
  };

  return (
    <View style={styles.root}>
      <TopBar active="Saved" onTabPress={goTab} />

      {!user ? (
        <View style={styles.center}>
          <Text style={styles.label}>Sign in to see your saved trips & stops.</Text>
          <Btn sm onPress={() => router.push('/sign-in')}>Sign in</Btn>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.acc} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.label}>Nothing saved yet. Tap the bookmark on a post or trip.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.grid, isPhone && styles.gridPhone]}>
          {items.map((item) => (
            <SavedCard
              key={item.id}
              item={item}
              onOpen={() => openItem(item)}
              onRemove={() => unsave.mutate(item.id)}
              cardStyle={isPhone ? styles.cardPhone : undefined}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  label: { fontSize: fontSize.lg, color: colors.sub, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, padding: spacing.xxl },
  gridPhone: { padding: spacing.lg, gap: spacing.md },
  cardPhone: { width: '100%' },
  card: {
    width: 240,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  cover: { height: 150, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  coverImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  kind: { position: 'absolute', top: 10, left: 10 },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(44,42,38,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: colors.white, fontSize: fontSize.sm },
  meta: { padding: spacing.md, gap: 4 },
  title: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: fontSize.sm, color: colors.sub },
});

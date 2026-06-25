/**
 * Saved tab — the user's bookmarked stops & trips.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBookings, useSaved, useUnsaveItem } from '@trailr/db';
import type { BookingRow, SavedItem } from '@trailr/db';
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

function BookingCard({ booking, onOpen, cardStyle }: { booking: BookingRow; onOpen: () => void; cardStyle?: ViewStyle }) {
  const isFlight = booking.type === 'flight';
  return (
    <TouchableOpacity
      style={[styles.bookingCard, booking.status === 'cancelled' && styles.bookingCardMuted, cardStyle]}
      onPress={onOpen}
      activeOpacity={0.88}
    >
      <View style={styles.bookingIcon}>
        <Text style={styles.bookingIconText}>{isFlight ? 'Flight' : 'Stay'}</Text>
      </View>
      <View style={styles.bookingMeta}>
        <Text style={styles.title} numberOfLines={1}>{booking.title ?? (isFlight ? 'Flight booking' : 'Hotel booking')}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {booking.amount_thb != null ? `${booking.amount_thb.toLocaleString()} THB` : 'Amount pending'} - {new Date(booking.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Chip dot={false} accent={booking.status === 'confirmed'}>{booking.status}</Chip>
    </TouchableOpacity>
  );
}

export default function SavedScreen() {
  const router = useRouter();
  const { isPhone } = useResponsive();
  const user = useAuthStore((s) => s.user);
  const [segment, setSegment] = useState<'saved' | 'booked'>('saved');
  const { data: items = [], isLoading } = useSaved();
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings();
  const unsave = useUnsaveItem();

  const goTab = (tab: string) => {
    if (tab === 'Feed') router.push('/(tabs)/');
    if (tab === 'Explore') router.push('/(tabs)/explore');
    if (tab === 'Trips') router.push('/(tabs)/trips');
    if (tab === 'Book') router.push('/(tabs)/book');
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
      ) : (
        <>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentBtn, segment === 'saved' && styles.segmentBtnActive]}
              onPress={() => setSegment('saved')}
            >
              <Text style={[styles.segmentText, segment === 'saved' && styles.segmentTextActive]}>Saved</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, segment === 'booked' && styles.segmentBtnActive]}
              onPress={() => setSegment('booked')}
            >
              <Text style={[styles.segmentText, segment === 'booked' && styles.segmentTextActive]}>Booked</Text>
            </TouchableOpacity>
          </View>

          {segment === 'saved' ? (
            isLoading ? (
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
            )
          ) : bookingsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.acc} size="large" />
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.label}>No bookings yet. Book a flight or stay from the Book tab.</Text>
              <Btn sm onPress={() => router.push('/(tabs)/book')}>Book travel</Btn>
            </View>
          ) : (
            <ScrollView contentContainerStyle={[styles.bookingList, isPhone && styles.gridPhone]}>
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onOpen={() => router.push(`/booking/view/${booking.id}`)}
                  cardStyle={isPhone ? styles.cardPhone : undefined}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  label: { fontSize: fontSize.lg, color: colors.sub, textAlign: 'center' },
  segment: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: spacing.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
  },
  segmentBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.pill },
  segmentBtnActive: { backgroundColor: colors.paper },
  segmentText: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '800' },
  segmentTextActive: { color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, padding: spacing.xxl },
  bookingList: { gap: spacing.md, padding: spacing.xxl, maxWidth: 860, width: '100%', alignSelf: 'center' },
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
  bookingCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  bookingCardMuted: { opacity: 0.55 },
  bookingIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingIconText: { fontSize: fontSize.xs, color: colors.acc, fontWeight: '800', textTransform: 'uppercase' },
  bookingMeta: { flex: 1, minWidth: 0 },
});

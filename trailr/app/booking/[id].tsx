/**
 * One-Click Booking — BookA: live flight + hotel offers for a trip (+ map).
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useOfferSearch, useCreateBooking } from '@trailr/db';
import type { BookingOffer } from '@trailr/db';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { MapView } from '../../src/components/MapView';
import { useAuthStore } from '../../src/stores/authStore';

function baht(n: number): string {
  return `฿${n.toLocaleString()}`;
}

function FlightCard({ offer, booking, onBook }: { offer: BookingOffer; booking: boolean; onBook: () => void }) {
  return (
    <View style={styles.flightCard}>
      <Text style={styles.flightIcon}>✈</Text>
      <View style={styles.flightInfo}>
        <Text style={styles.flightRoute}>{offer.title}</Text>
        <Text style={styles.flightSub}>{offer.subtitle}</Text>
      </View>
      <View style={styles.spacer} />
      <View style={styles.flightPrice}>
        <Text style={styles.priceText}>{baht(offer.amount_thb)}</Text>
        <Text style={styles.amadeusLabel}>via {offer.provider}</Text>
      </View>
      <Btn solid sm onPress={onBook}>{booking ? '…' : 'Book'}</Btn>
    </View>
  );
}

function HotelRow({ offer, onBook }: { offer: BookingOffer; onBook: () => void }) {
  return (
    <View style={styles.hotelRow}>
      <View style={styles.hotelPhoto}>
        <Text style={styles.hotelPhotoLabel}>[ hotel ]</Text>
      </View>
      <View style={styles.hotelMeta}>
        <Text style={styles.hotelName} numberOfLines={1}>{offer.title}</Text>
        <View style={styles.hotelTags}>
          <Chip dot={false}>{offer.subtitle}</Chip>
        </View>
      </View>
      <View style={styles.hotelPrice}>
        <Text style={styles.priceText}>{baht(offer.amount_thb)}</Text>
        <Btn solid sm onPress={onBook}>Book</Btn>
      </View>
    </View>
  );
}

export default function BookingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = id ?? '';
  const user = useAuthStore((s) => s.user);

  const flightsQ = useOfferSearch({ type: 'flight', origin: 'BKK', destination: 'KIX' });
  const hotelsQ = useOfferSearch({ type: 'hotel', city: 'Kyoto', nights: 3 });
  const createBooking = useCreateBooking(tripId);

  const book = (offer: BookingOffer) => {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    createBooking.mutate(
      {
        type: offer.type,
        provider: offer.provider,
        trip_id: tripId,
        external_ref: offer.id,
        amount_thb: offer.amount_thb,
        title: offer.title,
      },
      {
        onSuccess: () =>
          Alert.alert('Booked ✓', `${offer.title} added to your trip (pending).`),
        onError: (e) => Alert.alert('Booking failed', String(e)),
      },
    );
  };

  const hotels = hotelsQ.data ?? [];
  const hotelPins = hotels
    .filter((h) => h.latitude != null && h.longitude != null)
    .map((h) => ({
      id: h.id,
      latitude: h.latitude as number,
      longitude: h.longitude as number,
      location: h.title,
      caption: h.subtitle,
    }));

  return (
    <View style={styles.root}>
      {/* header */}
      <View style={styles.header}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Add stays & flights</Text>
        <View style={styles.spacer} />
        <Chip dot={false}>Trailr earns a small commission</Chip>
      </View>

      <View style={styles.body}>
        {/* ── Left: booking column ── */}
        <ScrollView style={styles.bookingCol} contentContainerStyle={styles.bookingContent}>
          {/* flights */}
          {flightsQ.isLoading ? (
            <ActivityIndicator color={colors.acc} />
          ) : (
            (flightsQ.data ?? []).map((offer) => (
              <FlightCard key={offer.id} offer={offer} booking={createBooking.isPending} onBook={() => book(offer)} />
            ))
          )}

          {/* hotels header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stays near your route</Text>
          </View>

          {hotelsQ.isLoading ? (
            <ActivityIndicator color={colors.acc} />
          ) : (
            hotels.map((offer) => <HotelRow key={offer.id} offer={offer} onBook={() => book(offer)} />)
          )}
        </ScrollView>

        {/* ── Right: map ── */}
        <View style={styles.mapCol}>
          <MapView
            initialLatitude={hotelPins[0]?.latitude ?? 35.0116}
            initialLongitude={hotelPins[0]?.longitude ?? 135.7681}
            initialZoom={12}
            posts={hotelPins}
          >
            <View style={styles.mapLegend}>
              <View style={[styles.legendDot, { backgroundColor: colors.acc }]} />
              <Text style={styles.legendText}>= stays near your stops</Text>
            </View>
          </MapView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexShrink: 0,
  },
  back: { color: colors.sub, fontSize: fontSize.md },
  pageTitle: { fontSize: 20, color: colors.ink },
  spacer: { flex: 1 },
  body: { flex: 1, flexDirection: 'row' },
  bookingCol: { width: 560, borderRightWidth: 1, borderRightColor: colors.line },
  bookingContent: { padding: spacing.xl, gap: spacing.md },
  flightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  flightIcon: { fontSize: 22 },
  flightInfo: { gap: 5 },
  flightRoute: { fontSize: 17, color: colors.ink },
  flightSub: { fontSize: fontSize.sm, color: colors.sub },
  flightPrice: { alignItems: 'flex-end', gap: 2 },
  amadeusLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 18 },
  hotelRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  hotelPhoto: {
    width: 110,
    height: 90,
    backgroundColor: colors.panel,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelPhotoLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  hotelMeta: { flex: 1, justifyContent: 'center', gap: 6 },
  hotelName: { fontSize: fontSize.base, fontWeight: '600', color: colors.ink },
  hotelTags: { flexDirection: 'row', gap: 6 },
  hotelPrice: { alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  priceText: { fontSize: 18, color: colors.ink, fontWeight: '600' },
  mapCol: { flex: 1 },
  mapLegend: {
    position: 'absolute',
    right: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: fontSize.sm },
});

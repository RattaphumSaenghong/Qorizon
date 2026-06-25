import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  createStop,
  useCreateBooking,
  useHotelCatalog,
  useHotelRates,
} from '@trailr/db';
import type { BookingOffer, HotelCatalogQuery, HotelPin, HotelRatesQuery } from '@trailr/db';
import { Btn } from '../src/components/Btn';
import { HotelDetailSheet } from '../src/components/HotelDetailSheet';
import { MapView } from '../src/components/MapView';
import { PressableScale } from '../src/components/PressableScale';
import { TopBar } from '../src/components/TopBar';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { usePlaceSuggestions } from '../src/hooks/usePlaceSuggestions';
import { useToast } from '../src/components/Toast';
import { useAuthStore } from '../src/stores/authStore';
import { colors, fontSize, radius, shadow, spacing } from '../src/theme/tokens';

const PRICE_THRESHOLD = 40;
const MAX_RADIUS_M = 20_000;
const DEFAULT_CENTER = { latitude: 13.7563, longitude: 100.5018 };

interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

function addDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function defaultCheckIn(): string {
  return addDays(new Date().toISOString().slice(0, 10), 14);
}

function moneyShort(n?: number): string | undefined {
  if (n == null) return undefined;
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}

function hotelIdFromOffer(offer: BookingOffer): string | null {
  const value = offer.meta?.['hotel_id'];
  return typeof value === 'string' ? value : null;
}

function radiusFromBounds(bounds: Bounds, center: { latitude: number; longitude: number }): number {
  const corner = { latitude: bounds.north, longitude: bounds.east };
  return Math.min(MAX_RADIUS_M, Math.max(500, Math.round(haversineM(center, corner))));
}

function centerFromBounds(bounds: Bounds): { latitude: number; longitude: number } {
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2,
  };
}

function haversineM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const r = 6371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * r * Math.asin(Math.sqrt(h));
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export default function ExploreStaysScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = typeof params.tripId === 'string' ? params.tripId : null;
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebouncedValue(rawSearch, 250);
  const places = usePlaceSuggestions(debouncedSearch);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [dirty, setDirty] = useState(true);
  const [checkIn, setCheckIn] = useState(defaultCheckIn());
  const [checkOut, setCheckOut] = useState(addDays(defaultCheckIn(), 3));
  const [catalogQuery, setCatalogQuery] = useState<HotelCatalogQuery | null>(null);
  const [ratesQuery, setRatesQuery] = useState<HotelRatesQuery | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const fallbackQuery = useMemo<HotelCatalogQuery>(() => ({
    latitude: center.latitude,
    longitude: center.longitude,
    radiusM: 5000,
    limit: 60,
  }), [center.latitude, center.longitude]);
  const catalogQ = useHotelCatalog(catalogQuery ?? fallbackQuery, catalogQuery != null);
  const ratesQ = useHotelRates(ratesQuery ?? { hotelIds: [], check_in: checkIn, check_out: checkOut, adults: 2 }, ratesQuery != null);
  const createBooking = useCreateBooking(tripId ?? undefined);

  const hotels = catalogQ.data ?? [];
  const offers = ratesQ.data ?? [];
  const offersByHotelId = useMemo(() => {
    const map = new Map<string, BookingOffer>();
    for (const offer of offers) {
      const hotelId = hotelIdFromOffer(offer);
      if (hotelId) map.set(hotelId, offer);
    }
    return map;
  }, [offers]);
  const selectedHotel = hotels.find((h) => h.hotel_id === selectedId) ?? null;
  const selectedOffer = selectedHotel ? offersByHotelId.get(selectedHotel.hotel_id) : undefined;

  useEffect(() => {
    if (hotels.length > 0 && hotels.length <= PRICE_THRESHOLD) {
      setRatesQuery({
        hotelIds: hotels.map((h) => h.hotel_id),
        check_in: checkIn,
        check_out: checkOut,
        adults: 2,
      });
    } else {
      setRatesQuery(null);
    }
  }, [hotels, checkIn, checkOut]);

  const runAreaSearch = () => {
    const currentCenter = bounds ? centerFromBounds(bounds) : center;
    const radiusM = bounds ? radiusFromBounds(bounds, currentCenter) : 5000;
    setCenter(currentCenter);
    setCatalogQuery({
      latitude: currentCenter.latitude,
      longitude: currentCenter.longitude,
      radiusM,
      limit: 80,
    });
    setSelectedId(null);
    setDirty(false);
  };

  const pickPlace = async (suggestion: Parameters<typeof places.resolve>[0]) => {
    const coord = await places.resolve(suggestion);
    if (!coord) return;
    setCenter(coord);
    setRawSearch(suggestion.name);
    setDirty(true);
  };

  const bookSelected = () => {
    if (!selectedHotel || !selectedOffer) return;
    if (!user) { router.push('/sign-in'); return; }
    createBooking.mutate(
      {
        type: 'hotel',
        provider: selectedOffer.provider,
        trip_id: tripId ?? undefined,
        external_ref: selectedOffer.id,
        amount_thb: selectedOffer.amount_thb,
        title: selectedHotel.name,
        meta: {
          ...selectedOffer.meta,
          latitude: selectedHotel.latitude,
          longitude: selectedHotel.longitude,
        },
      },
      { onSuccess: () => toast('Stay added to bookings') },
    );
  };

  const addToTrip = async () => {
    if (!tripId || !selectedHotel) return;
    if (!user) { router.push('/sign-in'); return; }
    setAdding(true);
    try {
      await createStop({
        trip_id: tripId,
        user_id: user.id,
        day_id: null,
        status: 'planned',
        category: 'hotel',
        location_name: selectedHotel.name,
        latitude: selectedHotel.latitude,
        longitude: selectedHotel.longitude,
        place_id: null,
        planned_start: null,
        planned_end: null,
        duration_mins: null,
        cost: selectedOffer?.amount_thb ?? null,
        sort_order: 0,
        notes: selectedOffer ? `Explore Stays rate ${selectedOffer.id}` : null,
        caption: null,
        captured_at: null,
        batch_date: null,
        scope: 'shared',
      });
      toast('Stay added to Unsorted');
    } catch {
      toast('Could not add stay');
    } finally {
      setAdding(false);
    }
  };

  const posts = hotels.map((hotel) => {
    const offer = offersByHotelId.get(hotel.hotel_id);
    return {
      id: hotel.hotel_id,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      location: offer ? `${moneyShort(offer.amount_thb)} THB` : hotel.name,
      caption: hotel.address ?? '',
      priceLabel: offer ? moneyShort(offer.amount_thb) : undefined,
      markerKind: 'planned' as const,
    };
  });

  return (
    <View style={styles.root}>
      <TopBar
        active="Explore"
        onTabPress={(tab) => {
          if (tab === 'Feed') router.push('/(tabs)/');
          if (tab === 'Explore') router.push('/(tabs)/explore');
          if (tab === 'Trips') router.push('/(tabs)/trips');
          if (tab === 'Saved') router.push('/(tabs)/saved');
        }}
      />

      <View style={styles.mapWrap}>
        <MapView
          initialLatitude={center.latitude}
          initialLongitude={center.longitude}
          initialZoom={13}
          center={center}
          posts={posts}
          activeId={selectedId}
          onSelectPost={setSelectedId}
          onBoundsChange={(next) => {
            setBounds(next);
            setDirty(true);
          }}
          style={styles.map}
        />

        <View style={styles.searchPanel}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={rawSearch}
              onChangeText={setRawSearch}
              placeholder="Search a city or neighborhood"
              placeholderTextColor={colors.sub}
            />
            <Btn solid sm onPress={runAreaSearch} loading={catalogQ.isFetching}>
              Search this area
            </Btn>
          </View>
          {places.suggestions.length > 0 ? (
            <View style={styles.suggestions}>
              {places.suggestions.map((s) => (
                <TouchableOpacity key={s.mapbox_id} style={styles.suggestion} onPress={() => pickPlace(s)}>
                  <Text style={styles.suggestionName}>{s.name}</Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>{s.place_formatted ?? s.feature_type ?? ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {dirty ? (
          <PressableScale style={styles.floatButton} onPress={runAreaSearch}>
            <Text style={styles.floatText}>Search this area</Text>
          </PressableScale>
        ) : null}

        <View style={styles.resultsPanel}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Stays</Text>
            <Text style={styles.resultsSub}>
              {catalogQ.isFetching ? 'Searching...' : `${hotels.length} in view`}
              {ratesQ.isFetching ? ' - loading prices' : offers.length > 0 ? ` - ${offers.length} priced` : ''}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <TextInput style={styles.dateInput} value={checkIn} onChangeText={setCheckIn} placeholder="Check-in" placeholderTextColor={colors.sub} />
            <TextInput style={styles.dateInput} value={checkOut} onChangeText={setCheckOut} placeholder="Check-out" placeholderTextColor={colors.sub} />
          </View>
          {catalogQ.isFetching && hotels.length === 0 ? (
            <ActivityIndicator color={colors.acc} />
          ) : hotels.length === 0 ? (
            <Text style={styles.empty}>Move the map, then search this area.</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.resultList}>
              {hotels.slice(0, 30).map((hotel) => {
                const offer = offersByHotelId.get(hotel.hotel_id);
                const active = hotel.hotel_id === selectedId;
                return (
                  <TouchableOpacity
                    key={hotel.hotel_id}
                    style={[styles.resultCard, active && styles.resultCardActive]}
                    onPress={() => setSelectedId(hotel.hotel_id)}
                  >
                    <View style={styles.resultMain}>
                      <Text style={styles.hotelName} numberOfLines={1}>{hotel.name}</Text>
                      <Text style={styles.hotelMeta} numberOfLines={1}>
                        {hotel.rating != null ? `Rating ${hotel.rating}` : 'Hotel'}{hotel.address ? ` - ${hotel.address}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.priceText}>{offer ? `${offer.amount_thb.toLocaleString()} THB` : 'No price'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      <HotelDetailSheet
        visible={selectedHotel != null}
        hotel={selectedHotel}
        offer={selectedOffer}
        tripId={tripId}
        booking={createBooking.isPending}
        adding={adding}
        onBook={bookSelected}
        onAddToTrip={addToTrip}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  searchPanel: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    maxWidth: 620,
    gap: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.md,
    color: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    outlineStyle: 'none',
  } as object,
  suggestions: {
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow.sm,
  },
  suggestion: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  suggestionName: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '800' },
  suggestionSub: { fontSize: fontSize.xs, color: colors.sub, marginTop: 2 },
  floatButton: {
    position: 'absolute',
    top: 94,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.acc,
    ...shadow.sm,
  },
  floatText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '800' },
  resultsPanel: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
    bottom: spacing.lg,
    width: 360,
    maxWidth: '42%',
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    ...shadow.md,
  },
  resultsHeader: { gap: 2 },
  resultsTitle: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800' },
  resultsSub: { fontSize: fontSize.sm, color: colors.sub },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.ink,
    backgroundColor: colors.panel,
    outlineStyle: 'none',
  } as object,
  empty: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center', paddingVertical: spacing.xl },
  resultList: { gap: spacing.sm, paddingBottom: spacing.md },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
  },
  resultCardActive: { borderColor: colors.acc, backgroundColor: colors.accSoft },
  resultMain: { flex: 1, minWidth: 0 },
  hotelName: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '800' },
  hotelMeta: { fontSize: fontSize.xs, color: colors.sub, marginTop: 2 },
  priceText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '800' },
});

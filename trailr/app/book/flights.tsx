import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AirportInput } from '../../src/components/AirportInput';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError, useCreateBooking, useFlightPriceCalendar, useOfferSearch } from '@trailr/db';
import type { BookingOffer, SearchBookingRequest } from '@trailr/db';
import { Btn } from '../../src/components/Btn';
import { DatePicker } from '../../src/components/DatePicker';
import { PressableScale } from '../../src/components/PressableScale';
import { TopBar } from '../../src/components/TopBar';
import { useAuthStore } from '../../src/stores/authStore';
import { useToast } from '../../src/components/Toast';
import { flightRowLine } from '../../src/lib/bookingDisplay';
import { colors, fontSize, radius, shadow, spacing } from '../../src/theme/tokens';

function todayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function money(n: number): string {
  return `${n.toLocaleString()} THB`;
}

function prettyDate(ymd: string): string {
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function DateField({
  label, value, onChange, initialYear, placeholder, minDate, prices, onViewMonthChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  initialYear?: number;
  placeholder?: string;
  minDate?: string;
  prices?: Record<string, number>;
  onViewMonthChange?: (year: number, month: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale style={styles.input} onPress={() => setOpen(true)}>
        <Text style={value ? styles.inputText : styles.placeholder}>{value ? prettyDate(value) : placeholder ?? 'Select date'}</Text>
      </PressableScale>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dateBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.dateSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateTitle}>{label}</Text>
              <Pressable hitSlop={8} onPress={() => setOpen(false)}><Text style={styles.dateClose}>✕</Text></Pressable>
            </View>
            <DatePicker
              value={value || null}
              initialYear={initialYear}
              minDate={minDate}
              prices={prices}
              onViewMonthChange={onViewMonthChange}
              onChange={(v) => { onChange(v ?? ''); setOpen(false); }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function FlightOfferCard({ offer, booking, onBook }: { offer: BookingOffer; booking: boolean; onBook: () => void }) {
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerMain}>
        <Text style={styles.offerTitle}>{offer.title}</Text>
        <Text style={styles.offerSub}>{(offer.type === 'flight' ? flightRowLine(offer.meta) : null) ?? offer.subtitle}</Text>
      </View>
      <Text style={styles.price}>{money(offer.amount_thb)}</Text>
      <Btn solid sm onPress={onBook} loading={booking}>Book</Btn>
    </View>
  );
}

export default function BookFlightsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = typeof params.tripId === 'string' ? params.tripId : undefined;
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [origin, setOrigin] = useState('BKK');
  const [destination, setDestination] = useState('KIX');
  const [departDate, setDepartDate] = useState(todayPlus(14));
  const [returnDate, setReturnDate] = useState('');
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [submitted, setSubmitted] = useState<SearchBookingRequest | null>(null);

  // Track which month the user is viewing in each picker so we fetch the right month
  const defaultYear = new Date(departDate).getFullYear();
  const defaultMonth = new Date(departDate).getMonth() + 1;
  const [departViewMonth, setDepartViewMonth] = useState<[number, number]>([defaultYear, defaultMonth]);
  const [returnViewMonth, setReturnViewMonth] = useState<[number, number]>([defaultYear, defaultMonth]);

  const departPricesQ = useFlightPriceCalendar(origin, destination, departViewMonth[0], departViewMonth[1], origin.length === 3 && destination.length === 3);
  const returnPricesQ = useFlightPriceCalendar(destination, origin, returnViewMonth[0], returnViewMonth[1], tripType === 'round-trip' && origin.length === 3 && destination.length === 3);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bornOn, setBornOn] = useState('');

  const swap = () => {
    const prev = origin;
    setOrigin(destination);
    setDestination(prev);
  };

  const handleDepartChange = (v: string) => {
    setDepartDate(v);
    // If return is now before depart, push it forward by 7 days
    if (returnDate && v && returnDate <= v) {
      const d = new Date(v + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      setReturnDate(d.toISOString().slice(0, 10));
    }
  };

  const handleTripTypeChange = (t: 'one-way' | 'round-trip') => {
    setTripType(t);
    // Pre-fill return date to depart + 7 when switching to round-trip with no return set
    if (t === 'round-trip' && !returnDate && departDate) {
      const d = new Date(departDate + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      setReturnDate(d.toISOString().slice(0, 10));
    }
  };

  const draft = useMemo<SearchBookingRequest>(() => ({
    type: 'flight',
    origin: origin.trim().toUpperCase(),
    destination: destination.trim().toUpperCase(),
    depart_date: departDate,
    ...(tripType === 'round-trip' && returnDate ? { return_date: returnDate } : {}),
  }), [origin, destination, departDate, returnDate, tripType]);
  const offersQ = useOfferSearch(submitted ?? draft, submitted != null);
  const createBooking = useCreateBooking(tripId);

  const goTab = (tab: string) => {
    if (tab === 'Feed') router.push('/(tabs)/');
    if (tab === 'Explore') router.push('/(tabs)/explore');
    if (tab === 'Trips') router.push('/(tabs)/trips');
    if (tab === 'Saved') router.push('/(tabs)/saved');
    if (tab === 'Book') router.push('/(tabs)/book');
  };

  const book = (offer: BookingOffer) => {
    if (!user) { router.push('/sign-in'); return; }
    createBooking.mutate(
      {
        type: 'flight',
        provider: offer.provider,
        trip_id: tripId,
        external_ref: offer.id,
        amount_thb: offer.amount_thb,
        title: offer.title,
        meta: offer.meta,
        ...(givenName.trim() && familyName.trim()
          ? {
              passenger_details: {
                title: 'mr',
                given_name: givenName.trim(),
                family_name: familyName.trim(),
                born_on: bornOn.trim() || undefined,
                email: email.trim() || undefined,
                phone_number: phone.trim() || undefined,
              },
            }
          : {}),
      },
      {
        onSuccess: () => toast(tripId ? 'Flight added to trip' : 'Flight booked'),
        onError: (e) => toast(e instanceof ApiError ? e.message : 'Could not book flight'),
      },
    );
  };

  const offers = offersQ.data ?? [];

  return (
    <View style={styles.root}>
      <TopBar active="Book" onTabPress={goTab} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>Flights</Text>
              <Text style={styles.sub}>Search fares, then book or attach to a trip.</Text>
            </View>
            <Btn sm onPress={() => router.push(tripId ? `/book/stays?tripId=${tripId}` : '/book/stays')}>Stays</Btn>
          </View>

          <View style={styles.tripTypeRow}>
            <Pressable
              style={[styles.tripTypeBtn, tripType === 'one-way' && styles.tripTypeBtnActive]}
              onPress={() => handleTripTypeChange('one-way')}
            >
              <Text style={[styles.tripTypeTxt, tripType === 'one-way' && styles.tripTypeTxtActive]}>One way</Text>
            </Pressable>
            <Pressable
              style={[styles.tripTypeBtn, tripType === 'round-trip' && styles.tripTypeBtnActive]}
              onPress={() => handleTripTypeChange('round-trip')}
            >
              <Text style={[styles.tripTypeTxt, tripType === 'round-trip' && styles.tripTypeTxtActive]}>Round trip</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <AirportInput label="From" value={origin} onChange={setOrigin} />
            <Pressable style={styles.swapBtn} onPress={swap}>
              <Text style={styles.swapIcon}>⇄</Text>
            </Pressable>
            <AirportInput label="To" value={destination} onChange={setDestination} />
            <DateField
              label="Depart"
              value={departDate}
              onChange={handleDepartChange}
              prices={departPricesQ.data}
              onViewMonthChange={(y, m) => setDepartViewMonth([y, m])}
            />
            {tripType === 'round-trip' && (
              <DateField
                label="Return"
                value={returnDate}
                onChange={setReturnDate}
                placeholder="Select return date"
                minDate={departDate || undefined}
                prices={returnPricesQ.data}
                onViewMonthChange={(y, m) => setReturnViewMonth([y, m])}
              />
            )}
          </View>

          <View style={styles.traveler}>
            <Text style={styles.label}>Passenger details (optional)</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.field]} value={givenName} onChangeText={setGivenName} placeholder="First name" placeholderTextColor={colors.sub} />
              <TextInput style={[styles.input, styles.field]} value={familyName} onChangeText={setFamilyName} placeholder="Last name" placeholderTextColor={colors.sub} />
            </View>
            <View style={styles.row}>
              <DateField label="Date of birth" value={bornOn} onChange={setBornOn} initialYear={1990} placeholder="Select date of birth" />
              <TextInput style={[styles.input, styles.field]} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.sub} />
              <TextInput style={[styles.input, styles.field]} value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={colors.sub} />
            </View>
          </View>

          <View style={styles.actions}>
            <Btn solid onPress={() => setSubmitted(draft)} loading={offersQ.isFetching}>Search flights</Btn>
          </View>

          {offersQ.isError ? <Text style={styles.error}>Could not search flights.</Text> : null}
          {offersQ.isFetching && offers.length === 0 ? (
            <ActivityIndicator color={colors.acc} />
          ) : submitted && offers.length === 0 ? (
            <Text style={styles.empty}>No fares found. Try another route or date.</Text>
          ) : (
            offers.map((offer) => (
              <FlightOfferCard key={offer.id} offer={offer} booking={createBooking.isPending} onBook={() => book(offer)} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { padding: spacing.xxl, alignItems: 'center' },
  panel: { width: '100%', maxWidth: 860, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heading: { fontSize: fontSize.xl, color: colors.ink, fontWeight: '800' },
  sub: { fontSize: fontSize.sm, color: colors.sub, marginTop: 3 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { flex: 1, minWidth: 160, gap: spacing.xs },
  label: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '800', textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    color: colors.ink,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 42,
    justifyContent: 'center',
    outlineStyle: 'none',
  } as object,
  inputText: { fontSize: fontSize.md, color: colors.ink },
  placeholder: { fontSize: fontSize.md, color: colors.sub },
  dateBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,42,38,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dateSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.md,
  },
  dateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateTitle: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800' },
  dateClose: { fontSize: fontSize.lg, color: colors.sub, fontWeight: '700' },
  tripTypeRow: { flexDirection: 'row', gap: spacing.xs },
  tripTypeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  tripTypeBtnActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  tripTypeTxt: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '700' },
  tripTypeTxtActive: { color: colors.paper },
  swapBtn: {
    alignSelf: 'flex-end',
    marginBottom: 1,
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  swapIcon: { fontSize: 18, color: colors.acc },
  traveler: { gap: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-start' },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    ...shadow.sm,
  },
  offerMain: { flex: 1, minWidth: 0, gap: 3 },
  offerTitle: { fontSize: fontSize.base, color: colors.ink, fontWeight: '800' },
  offerSub: { fontSize: fontSize.sm, color: colors.sub },
  price: { fontSize: fontSize.md, color: colors.ink, fontWeight: '800' },
  error: { fontSize: fontSize.sm, color: '#c0392b' },
  empty: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center', paddingVertical: spacing.xl },
});

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError, useCreateBooking, useOfferSearch } from '@trailr/db';
import type { BookingOffer, SearchBookingRequest } from '@trailr/db';
import { Btn } from '../../src/components/Btn';
import { DatePicker } from '../../src/components/DatePicker';
import { PressableScale } from '../../src/components/PressableScale';
import { TopBar } from '../../src/components/TopBar';
import { useAuthStore } from '../../src/stores/authStore';
import { useToast } from '../../src/components/Toast';
import { colors, fontSize, radius, shadow, spacing } from '../../src/theme/tokens';

function todayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function money(n: number): string {
  return `${n.toLocaleString()} THB`;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale style={styles.input} onPress={() => setOpen((v) => !v)}>
        <Text style={value ? styles.inputText : styles.placeholder}>{value || 'Select date'}</Text>
      </PressableScale>
      {open ? <DatePicker value={value || null} onChange={(v) => { onChange(v ?? ''); setOpen(false); }} /> : null}
    </View>
  );
}

function FlightOfferCard({ offer, booking, onBook }: { offer: BookingOffer; booking: boolean; onBook: () => void }) {
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerMain}>
        <Text style={styles.offerTitle}>{offer.title}</Text>
        <Text style={styles.offerSub}>{offer.subtitle}</Text>
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
  const [submitted, setSubmitted] = useState<SearchBookingRequest | null>(null);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bornOn, setBornOn] = useState('');

  const draft = useMemo<SearchBookingRequest>(() => ({
    type: 'flight',
    origin: origin.trim().toUpperCase(),
    destination: destination.trim().toUpperCase(),
    depart_date: departDate,
  }), [origin, destination, departDate]);
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

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>From</Text>
              <TextInput style={styles.input} value={origin} onChangeText={setOrigin} autoCapitalize="characters" maxLength={3} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>To</Text>
              <TextInput style={styles.input} value={destination} onChangeText={setDestination} autoCapitalize="characters" maxLength={3} />
            </View>
            <DateField label="Depart" value={departDate} onChange={setDepartDate} />
          </View>

          <View style={styles.traveler}>
            <Text style={styles.label}>Passenger details (optional)</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.field]} value={givenName} onChangeText={setGivenName} placeholder="First name" placeholderTextColor={colors.sub} />
              <TextInput style={[styles.input, styles.field]} value={familyName} onChangeText={setFamilyName} placeholder="Last name" placeholderTextColor={colors.sub} />
            </View>
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.field]} value={bornOn} onChangeText={setBornOn} placeholder="Born on YYYY-MM-DD" placeholderTextColor={colors.sub} />
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
    outlineStyle: 'none',
  } as object,
  inputText: { fontSize: fontSize.md, color: colors.ink },
  placeholder: { fontSize: fontSize.md, color: colors.sub },
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

import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError, useCreateBooking, useFlightPriceCalendar, useOfferSearch } from '@trailr/db';
import type { BookingOffer, FlightSummary, SearchBookingRequest } from '@trailr/db';
import { AirportInput } from '../../src/components/AirportInput';
import { Btn } from '../../src/components/Btn';
import { DatePicker } from '../../src/components/DatePicker';
import { PressableScale } from '../../src/components/PressableScale';
import { useToast } from '../../src/components/Toast';
import { TopBar } from '../../src/components/TopBar';
import {
  arrWithDayMarker,
  flightDurationMinutes,
  flightSummariesFromMeta,
  formatDuration,
  timeFromIso,
} from '../../src/lib/bookingDisplay';
import { useAuthStore } from '../../src/stores/authStore';
import { colors, fontSize, radius, shadow, spacing } from '../../src/theme/tokens';

type TripType = 'one-way' | 'round-trip';
type FlightSort = 'cheapest' | 'fastest' | 'best';
type Gender = 'm' | 'f';

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

function stopLabel(stops: number): string {
  return stops === 0 ? 'non-stop' : `${stops} stop${stops === 1 ? '' : 's'}`;
}

function airline(summary: FlightSummary | null, offer: BookingOffer): string {
  return summary?.carrier_name ?? summary?.carrier ?? offer.subtitle.split(' · ')[0] ?? 'Flight';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function routeSummary(offer: BookingOffer): string {
  const legs = flightSummariesFromMeta(offer.meta);
  const first = legs[0];
  const last = legs[legs.length - 1];
  if (!first) return `${offer.title} - ${money(offer.amount_thb)}`;
  const route = legs.length > 1
    ? `${first.origin} -> ${first.destination} return ${last.origin} -> ${last.destination}`
    : `${first.origin} -> ${first.destination}`;
  return `${airline(first, offer)} - ${route} - ${money(offer.amount_thb)}`;
}

function sortOffers(offers: BookingOffer[], sort: FlightSort): BookingOffer[] {
  const decorated = offers.map((offer) => ({
    offer,
    price: offer.amount_thb,
    duration: flightDurationMinutes(offer.meta),
  }));

  if (sort === 'cheapest') return decorated.sort((a, b) => a.price - b.price).map((x) => x.offer);
  if (sort === 'fastest') return decorated.sort((a, b) => a.duration - b.duration).map((x) => x.offer);

  const prices = decorated.map((x) => x.price);
  const durations = decorated.map((x) => x.duration).filter(Number.isFinite);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDur = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDur = durations.length > 0 ? Math.max(...durations) : 1;
  return decorated
    .sort((a, b) => {
      const aDur = Number.isFinite(a.duration) ? a.duration : maxDur;
      const bDur = Number.isFinite(b.duration) ? b.duration : maxDur;
      const aScore = 0.5 * ((a.price - minPrice) / (maxPrice - minPrice || 1)) + 0.5 * ((aDur - minDur) / (maxDur - minDur || 1));
      const bScore = 0.5 * ((b.price - minPrice) / (maxPrice - minPrice || 1)) + 0.5 * ((bDur - minDur) / (maxDur - minDur || 1));
      return aScore - bScore;
    })
    .map((x) => x.offer);
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
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.dateSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable hitSlop={8} onPress={() => setOpen(false)}><Text style={styles.close}>x</Text></Pressable>
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

function SortTab({ value, active, onPress }: { value: FlightSort; active: boolean; onPress: () => void }) {
  const label = value[0].toUpperCase() + value.slice(1);
  return (
    <Pressable style={[styles.pill, active && styles.pillActive]} onPress={onPress}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FlightLegRow({ leg, label }: { leg: FlightSummary; label?: string }) {
  const dep = timeFromIso(leg.dep_at) ?? '--:--';
  const arr = timeFromIso(leg.arr_at);
  const arrLabel = arr ? arrWithDayMarker(arr, leg.dep_at, leg.arr_at).trim() : '--:--';
  const duration = formatDuration(leg.duration) ?? 'Duration pending';

  return (
    <View style={styles.legRow}>
      {label ? <Text style={styles.legLabel}>{label}</Text> : null}
      <View style={styles.timeBlock}>
        <Text style={styles.timeText}>{dep}</Text>
        <Text style={styles.codeText}>{leg.origin || 'From'}</Text>
      </View>
      <View style={styles.flightMiddle}>
        <Text style={styles.durationText}>{duration}</Text>
        <View style={styles.connector} />
        <Text style={styles.stopText}>{stopLabel(leg.stops)}</Text>
      </View>
      <View style={styles.timeBlockRight}>
        <Text style={styles.timeText}>{arrLabel}</Text>
        <Text style={styles.codeText}>{leg.destination || 'To'}</Text>
      </View>
    </View>
  );
}

function FlightResultCard({
  offer,
  booking,
  onSelect,
}: {
  offer: BookingOffer;
  booking: boolean;
  onSelect: () => void;
}) {
  const legs = flightSummariesFromMeta(offer.meta);
  const first = legs[0] ?? null;

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultMain}>
        <View style={styles.resultTop}>
          <Text style={styles.airline} numberOfLines={1}>{airline(first, offer)}</Text>
          {legs.length > 1 ? <Text style={styles.roundTrip}>Round trip</Text> : null}
        </View>
        {legs.length > 0 ? (
          legs.map((leg, index) => (
            <FlightLegRow
              key={`${leg.origin}-${leg.destination}-${leg.dep_at ?? index}`}
              leg={leg}
              label={legs.length > 1 ? (index === 0 ? 'Outbound' : 'Return') : undefined}
            />
          ))
        ) : (
          <Text style={styles.fallbackText}>{offer.subtitle}</Text>
        )}
      </View>
      <View style={styles.priceRail}>
        <Text style={styles.price}>{money(offer.amount_thb)}</Text>
        <Btn solid sm onPress={onSelect} loading={booking}>Select</Btn>
      </View>
    </View>
  );
}

function PassengerModal({
  offer,
  visible,
  booking,
  givenName,
  familyName,
  gender,
  bornOn,
  email,
  phone,
  onGivenName,
  onFamilyName,
  onGender,
  onBornOn,
  onEmail,
  onPhone,
  onClose,
  onConfirm,
}: {
  offer: BookingOffer | null;
  visible: boolean;
  booking: boolean;
  givenName: string;
  familyName: string;
  gender: Gender | null;
  bornOn: string;
  email: string;
  phone: string;
  onGivenName: (value: string) => void;
  onFamilyName: (value: string) => void;
  onGender: (value: Gender) => void;
  onBornOn: (value: string) => void;
  onEmail: (value: string) => void;
  onPhone: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const canConfirm =
    givenName.trim().length > 0 &&
    familyName.trim().length > 0 &&
    gender != null &&
    bornOn.trim().length > 0 &&
    isValidEmail(email) &&
    phone.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.passengerSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Passenger details</Text>
              {offer ? <Text style={styles.modalSub} numberOfLines={2}>{routeSummary(offer)}</Text> : null}
            </View>
            <Pressable hitSlop={8} onPress={onClose}><Text style={styles.close}>x</Text></Pressable>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <View style={styles.tripTypeRow}>
              <Pressable style={[styles.pill, gender === 'm' && styles.pillActive]} onPress={() => onGender('m')}>
                <Text style={[styles.pillText, gender === 'm' && styles.pillTextActive]}>Mr</Text>
              </Pressable>
              <Pressable style={[styles.pill, gender === 'f' && styles.pillActive]} onPress={() => onGender('f')}>
                <Text style={[styles.pillText, gender === 'f' && styles.pillTextActive]}>Ms</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>First name *</Text>
              <TextInput style={styles.input} value={givenName} onChangeText={onGivenName} placeholder="First name" placeholderTextColor={colors.sub} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Last name *</Text>
              <TextInput style={styles.input} value={familyName} onChangeText={onFamilyName} placeholder="Last name" placeholderTextColor={colors.sub} />
            </View>
          </View>
          <DateField label="Date of birth *" value={bornOn} onChange={onBornOn} initialYear={1990} placeholder="Select date of birth" />
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} value={email} onChangeText={onEmail} placeholder="Email" placeholderTextColor={colors.sub} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput style={styles.input} value={phone} onChangeText={onPhone} placeholder="Phone" placeholderTextColor={colors.sub} keyboardType="phone-pad" />
            </View>
          </View>
          <Text style={styles.requiredNote}>* required to issue the ticket</Text>
          <Btn solid full disabled={!canConfirm} loading={booking} onPress={onConfirm}>Confirm booking</Btn>
        </Pressable>
      </Pressable>
    </Modal>
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
  const [tripType, setTripType] = useState<TripType>('one-way');
  const [submitted, setSubmitted] = useState<SearchBookingRequest | null>(null);
  const [sort, setSort] = useState<FlightSort>('best');
  const [selectedOffer, setSelectedOffer] = useState<BookingOffer | null>(null);
  const defaultYear = new Date(departDate).getFullYear();
  const defaultMonth = new Date(departDate).getMonth() + 1;
  const [departViewMonth, setDepartViewMonth] = useState<[number, number]>([defaultYear, defaultMonth]);
  const [returnViewMonth, setReturnViewMonth] = useState<[number, number]>([defaultYear, defaultMonth]);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bornOn, setBornOn] = useState('');

  const departPricesQ = useFlightPriceCalendar(origin, destination, departViewMonth[0], departViewMonth[1], origin.length === 3 && destination.length === 3);
  const returnPricesQ = useFlightPriceCalendar(destination, origin, returnViewMonth[0], returnViewMonth[1], tripType === 'round-trip' && origin.length === 3 && destination.length === 3);

  const swap = () => {
    const prev = origin;
    setOrigin(destination);
    setDestination(prev);
  };

  const handleDepartChange = (v: string) => {
    setDepartDate(v);
    if (returnDate && v && returnDate <= v) {
      const d = new Date(v + 'T00:00:00');
      d.setDate(d.getDate() + 7);
      setReturnDate(d.toISOString().slice(0, 10));
    }
  };

  const handleTripTypeChange = (t: TripType) => {
    setTripType(t);
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
  const offers = offersQ.data ?? [];
  const sortedOffers = useMemo(() => sortOffers(offers, sort), [offers, sort]);

  const goTab = (tab: string) => {
    if (tab === 'Feed') router.push('/(tabs)/');
    if (tab === 'Explore') router.push('/(tabs)/explore');
    if (tab === 'Trips') router.push('/(tabs)/trips');
    if (tab === 'Saved') router.push('/(tabs)/saved');
    if (tab === 'Book') router.push('/(tabs)/book');
  };

  const clearPassengerFields = () => {
    setGivenName('');
    setFamilyName('');
    setGender(null);
    setEmail('');
    setPhone('');
    setBornOn('');
  };

  const bookSelected = () => {
    if (!selectedOffer) return;
    if (!user) {
      setSelectedOffer(null);
      router.push('/sign-in');
      return;
    }
    createBooking.mutate(
      {
        type: 'flight',
        provider: selectedOffer.provider,
        trip_id: tripId,
        external_ref: selectedOffer.id,
        amount_thb: selectedOffer.amount_thb,
        title: selectedOffer.title,
        meta: selectedOffer.meta,
        passenger_details: {
          title: gender === 'f' ? 'ms' : 'mr',
          gender: gender ?? undefined,
          given_name: givenName.trim(),
          family_name: familyName.trim(),
          born_on: bornOn.trim() || undefined,
          email: email.trim() || undefined,
          phone_number: phone.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast(tripId ? 'Flight added to trip' : 'Flight booked');
          setSelectedOffer(null);
          clearPassengerFields();
        },
        onError: (e) => toast(e instanceof ApiError ? e.message : 'Could not book flight'),
      },
    );
  };

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

          <View style={styles.searchCard}>
            <View style={styles.tripTypeRow}>
              <Pressable
                style={[styles.pill, tripType === 'one-way' && styles.pillActive]}
                onPress={() => handleTripTypeChange('one-way')}
              >
                <Text style={[styles.pillText, tripType === 'one-way' && styles.pillTextActive]}>One way</Text>
              </Pressable>
              <Pressable
                style={[styles.pill, tripType === 'round-trip' && styles.pillActive]}
                onPress={() => handleTripTypeChange('round-trip')}
              >
                <Text style={[styles.pillText, tripType === 'round-trip' && styles.pillTextActive]}>Round trip</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <AirportInput label="From" value={origin} onChange={setOrigin} />
              <Pressable style={styles.swapBtn} onPress={swap}>
                <Text style={styles.swapIcon}>Swap</Text>
              </Pressable>
              <AirportInput label="To" value={destination} onChange={setDestination} />
            </View>

            <View style={styles.row}>
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

            <Btn solid full onPress={() => setSubmitted(draft)} loading={offersQ.isFetching}>Search flights</Btn>
          </View>

          {offers.length >= 2 ? (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultCount}>{offers.length} results</Text>
              <View style={styles.sortTabs}>
                <SortTab value="cheapest" active={sort === 'cheapest'} onPress={() => setSort('cheapest')} />
                <SortTab value="fastest" active={sort === 'fastest'} onPress={() => setSort('fastest')} />
                <SortTab value="best" active={sort === 'best'} onPress={() => setSort('best')} />
              </View>
            </View>
          ) : null}

          {offersQ.isError ? <Text style={styles.error}>Could not search flights.</Text> : null}
          {offersQ.isFetching && offers.length === 0 ? (
            <ActivityIndicator color={colors.acc} />
          ) : submitted && offers.length === 0 ? (
            <Text style={styles.empty}>No fares found. Try another route or date.</Text>
          ) : (
            sortedOffers.map((offer) => (
              <FlightResultCard
                key={offer.id}
                offer={offer}
                booking={createBooking.isPending && selectedOffer?.id === offer.id}
                onSelect={() => setSelectedOffer(offer)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <PassengerModal
        offer={selectedOffer}
        visible={selectedOffer != null}
        booking={createBooking.isPending}
        givenName={givenName}
        familyName={familyName}
        gender={gender}
        bornOn={bornOn}
        email={email}
        phone={phone}
        onGivenName={setGivenName}
        onFamilyName={setFamilyName}
        onGender={setGender}
        onBornOn={setBornOn}
        onEmail={setEmail}
        onPhone={setPhone}
        onClose={() => setSelectedOffer(null)}
        onConfirm={bookSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { padding: spacing.xxl, alignItems: 'center' },
  panel: { width: '100%', maxWidth: 920, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  heading: { fontSize: fontSize.xl, color: colors.ink, fontWeight: '800' },
  sub: { fontSize: fontSize.sm, color: colors.sub, marginTop: 3 },
  searchCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },
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
  tripTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  pillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  pillText: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '700' },
  pillTextActive: { color: colors.paper },
  swapBtn: {
    alignSelf: 'flex-end',
    marginBottom: 1,
    minWidth: 54,
    height: 42,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  swapIcon: { fontSize: fontSize.xs, color: colors.acc, fontWeight: '800', textTransform: 'uppercase' },
  resultsHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  resultCount: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '800' },
  sortTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  resultCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    ...shadow.sm,
  },
  resultMain: { flex: 1, minWidth: 280, gap: spacing.sm },
  resultTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  airline: { flex: 1, minWidth: 180, fontSize: fontSize.base, color: colors.ink, fontWeight: '800' },
  roundTrip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accSoft,
    color: colors.acc,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legLabel: { width: 64, fontSize: fontSize.xs, color: colors.sub, fontWeight: '800', textTransform: 'uppercase' },
  timeBlock: { width: 58 },
  timeBlockRight: { width: 72, alignItems: 'flex-end' },
  timeText: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800' },
  codeText: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '800' },
  flightMiddle: { flex: 1, minWidth: 96, alignItems: 'center', gap: 4 },
  durationText: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '700' },
  connector: { height: 1, alignSelf: 'stretch', backgroundColor: colors.line },
  stopText: { fontSize: fontSize.xs, color: colors.sub },
  fallbackText: { fontSize: fontSize.sm, color: colors.sub },
  priceRail: { minWidth: 132, alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  price: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800', textAlign: 'right' },
  modalBackdrop: {
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
  passengerSheet: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.md,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  modalHeaderText: { flex: 1, minWidth: 0 },
  modalTitle: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800' },
  modalSub: { fontSize: fontSize.sm, color: colors.sub, marginTop: 3 },
  requiredNote: { fontSize: fontSize.xs, color: colors.sub },
  close: { fontSize: fontSize.lg, color: colors.sub, fontWeight: '700' },
  error: { fontSize: fontSize.sm, color: '#c0392b' },
  empty: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center', paddingVertical: spacing.xl },
});

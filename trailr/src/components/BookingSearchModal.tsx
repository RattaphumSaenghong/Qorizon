import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCreateBooking, useOfferSearch } from '@trailr/db';
import type { BookingOffer, BookingType, SearchBookingRequest } from '@trailr/db';
import { colors, fontSize, radius, shadow, spacing } from '../theme/tokens';
import { Btn } from './Btn';
import { Chip } from './Chip';
import { DatePicker } from './DatePicker';
import { PressableScale } from './PressableScale';
import { WhoForControl, type AssigneeMember } from './WhoForControl';
import { flightRowLine } from '../lib/bookingDisplay';

/** A tappable field that reveals an inline calendar; keeps the sheet compact. */
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale style={styles.input} onPress={() => setOpen((o) => !o)}>
        <Text style={value ? styles.dateValue : styles.datePlaceholder}>{value || 'Select date'}</Text>
      </PressableScale>
      {open ? (
        <DatePicker value={value || null} onChange={(v) => { onChange(v ?? ''); setOpen(false); }} />
      ) : null}
    </View>
  );
}

const CITY_IATA: Record<string, string> = {
  bangkok: 'BKK',
  chiangmai: 'CNX',
  'chiang mai': 'CNX',
  hanoi: 'HAN',
  danang: 'DAD',
  'da nang': 'DAD',
  hoian: 'DAD',
  'hoi an': 'DAD',
  singapore: 'SIN',
  kuala: 'KUL',
  'kuala lumpur': 'KUL',
  tokyo: 'HND',
  kyoto: 'KIX',
  osaka: 'KIX',
  seoul: 'ICN',
  busan: 'PUS',
  taipei: 'TPE',
  hongkong: 'HKG',
  'hong kong': 'HKG',
  bali: 'DPS',
  denpasar: 'DPS',
  jakarta: 'CGK',
  manila: 'MNL',
};

interface Props {
  visible: boolean;
  type: BookingType;
  tripId: string;
  destination?: string | null;
  firstDate?: string | null;
  nights: number;
  members: AssigneeMember[];
  currentUserId?: string;
  onClose: () => void;
  onBooked: () => void;
  onManual: (type: BookingType) => void;
}

function cityToIata(destination?: string | null): string {
  const raw = destination?.trim().toLowerCase() ?? '';
  if (!raw) return 'KIX';
  return CITY_IATA[raw] ?? CITY_IATA[raw.replace(/[^a-z]/g, '')] ?? '';
}

function money(n: number): string {
  return `${n.toLocaleString()} THB`;
}

function offerLabel(offer: BookingOffer): string {
  return offer.provider === 'mock' ? 'mock offer' : `via ${offer.provider}`;
}

export function BookingSearchModal({
  visible,
  type,
  tripId,
  destination,
  firstDate,
  nights,
  members,
  currentUserId,
  onClose,
  onBooked,
  onManual,
}: Props) {
  const [origin, setOrigin] = useState('BKK');
  const [flightDestination, setFlightDestination] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [nightCount, setNightCount] = useState('1');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<SearchBookingRequest | null>(null);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bornOn, setBornOn] = useState('');
  const [showTraveler, setShowTraveler] = useState(false);

  const createBooking = useCreateBooking(tripId);

  useEffect(() => {
    if (!visible) return;
    setOrigin('BKK');
    setFlightDestination(cityToIata(destination));
    setDepartDate(firstDate ?? '');
    setCity(destination ?? '');
    setCheckIn(firstDate ?? '');
    setNightCount(String(Math.max(1, nights)));
    setAssigneeIds([]);
    setSubmitted(null);
    setGivenName('');
    setFamilyName('');
    setEmail('');
    setPhone('');
    setBornOn('');
    setShowTraveler(false);
  }, [visible, type, destination, firstDate, nights]);

  const draftParams = useMemo<SearchBookingRequest>(() => {
    if (type === 'flight') {
      return {
        type,
        trip_id: tripId,
        origin: origin.trim().toUpperCase(),
        destination: flightDestination.trim().toUpperCase(),
        depart_date: departDate.trim() || undefined,
      };
    }
    return {
      type,
      trip_id: tripId,
      city: city.trim(),
      check_in: checkIn.trim() || undefined,
      nights: Math.max(1, parseInt(nightCount, 10) || 1),
    };
  }, [type, tripId, origin, flightDestination, departDate, city, checkIn, nightCount]);

  const offersQ = useOfferSearch(submitted ?? draftParams, visible && submitted != null);
  const offers = offersQ.data ?? [];
  const isFlight = type === 'flight';

  const runSearch = () => setSubmitted(draftParams);

  const book = (offer: BookingOffer) => {
    createBooking.mutate(
      {
        type: offer.type,
        provider: offer.provider,
        trip_id: tripId,
        external_ref: offer.id,
        amount_thb: offer.amount_thb,
        title: offer.title,
        meta: offer.meta,
        ...(givenName.trim() && familyName.trim()
          ? isFlight
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
            : {
                guest_details: {
                  given_name: givenName.trim(),
                  family_name: familyName.trim(),
                  email: email.trim() || undefined,
                  phone_number: phone.trim() || undefined,
                },
              }
          : {}),
        ...(assigneeIds.length > 0 ? { assignee_ids: assigneeIds } : {}),
      },
      { onSuccess: onBooked },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <PressableScale style={styles.backdrop} onPress={onClose}>
        <PressableScale style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{isFlight ? 'Add a flight' : 'Add a stay'}</Text>
              <Text style={styles.subtitle}>{isFlight ? 'Search live fares or add details manually.' : 'Search stays near this trip or add one manually.'}</Text>
            </View>
            <PressableScale onPress={onClose} accessibilityLabel="Close booking search">
              <Text style={styles.close}>x</Text>
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {isFlight ? (
              <>
                <View style={styles.fieldRow}>
                  <View style={styles.field}>
                    <Text style={styles.label}>From</Text>
                    <TextInput style={styles.input} value={origin} onChangeText={setOrigin} autoCapitalize="characters" maxLength={3} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>To</Text>
                    <TextInput style={styles.input} value={flightDestination} onChangeText={setFlightDestination} autoCapitalize="characters" maxLength={3} placeholder="IATA" placeholderTextColor={colors.sub} />
                  </View>
                </View>
                <DateField label="Depart date" value={departDate} onChange={setDepartDate} />
              </>
            ) : (
              <>
                <Text style={styles.label}>City</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.sub} />
                <DateField label="Check-in" value={checkIn} onChange={setCheckIn} />
                <Text style={styles.label}>Nights</Text>
                <TextInput style={styles.input} value={nightCount} onChangeText={setNightCount} keyboardType="numeric" />
              </>
            )}

            <View style={styles.guestBox}>
              <PressableScale style={styles.travelerToggle} onPress={() => setShowTraveler((o) => !o)}>
                <Text style={styles.travelerToggleText}>
                  {showTraveler ? '▾' : '▸'} {isFlight ? 'Traveler details' : 'Guest details'} (optional)
                </Text>
              </PressableScale>
              {showTraveler ? (
                <>
                  <View style={styles.fieldRow}>
                    <View style={styles.field}>
                      <TextInput style={styles.input} value={givenName} onChangeText={setGivenName} placeholder="First name" placeholderTextColor={colors.sub} />
                    </View>
                    <View style={styles.field}>
                      <TextInput style={styles.input} value={familyName} onChangeText={setFamilyName} placeholder="Last name" placeholderTextColor={colors.sub} />
                    </View>
                  </View>
                  {isFlight ? (
                    <TextInput style={styles.input} value={bornOn} onChangeText={setBornOn} placeholder="Date of birth  YYYY-MM-DD" placeholderTextColor={colors.sub} />
                  ) : null}
                  <View style={styles.fieldRow}>
                    <View style={styles.field}>
                      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.sub} keyboardType="email-address" />
                    </View>
                    <View style={styles.field}>
                      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={colors.sub} />
                    </View>
                  </View>
                </>
              ) : null}
            </View>

            <WhoForControl
              members={members}
              assigneeIds={assigneeIds}
              onChange={setAssigneeIds}
              currentUserId={currentUserId}
            />

            <View style={styles.searchActions}>
              <Btn solid sm onPress={runSearch} loading={offersQ.isFetching}>
                Search
              </Btn>
              <PressableScale onPress={() => onManual(type)} style={styles.manualLink}>
                <Text style={styles.manualText}>+ Add manually instead</Text>
              </PressableScale>
            </View>

            {offersQ.isError && (
              <Text style={styles.errorText}>Could not search offers. Check the trip API and try again.</Text>
            )}

            {offersQ.isFetching && offers.length === 0 ? (
              <ActivityIndicator color={colors.acc} />
            ) : submitted && offers.length === 0 && !offersQ.isFetching ? (
              <Text style={styles.emptyText}>No offers found. Try changing the search, or add it manually.</Text>
            ) : (
              offers.map((offer) => {
                const subtitle = offer.type === 'flight' ? flightRowLine(offer.meta) ?? offer.subtitle : offer.subtitle;
                return (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerMain}>
                    <Text style={styles.offerTitle} numberOfLines={1}>{offer.title}</Text>
                    <Text style={styles.offerSubtitle} numberOfLines={2}>{subtitle}</Text>
                    <View style={styles.offerMeta}>
                      <Chip dot={false}>{offerLabel(offer)}</Chip>
                      <Chip dot={false}>{money(offer.amount_thb)}</Chip>
                    </View>
                  </View>
                  <Btn solid sm onPress={() => book(offer)} loading={createBooking.isPending}>
                    Add
                  </Btn>
                </View>
                );
              })
            )}
          </ScrollView>
        </PressableScale>
      </PressableScale>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(44,42,38,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '86%', backgroundColor: colors.paper, borderRadius: radius.md, padding: spacing.xl, gap: spacing.md, ...shadow.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: fontSize.sm, color: colors.sub, marginTop: 3 },
  close: { fontSize: fontSize.md, color: colors.sub, fontWeight: '800', paddingHorizontal: spacing.sm },
  content: { gap: spacing.sm, paddingBottom: spacing.sm },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  field: { flex: 1, gap: spacing.xs },
  label: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.panel,
  },
  dateValue: { fontSize: fontSize.md, color: colors.ink },
  datePlaceholder: { fontSize: fontSize.md, color: colors.sub },
  guestBox: { gap: spacing.sm, marginTop: spacing.sm },
  travelerToggle: { paddingVertical: spacing.xs },
  travelerToggleText: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '700' },
  searchActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  manualLink: { paddingVertical: spacing.sm },
  manualText: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '700' },
  errorText: { fontSize: fontSize.sm, color: '#c0392b' },
  emptyText: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center', paddingVertical: spacing.lg },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  offerMain: { flex: 1, gap: 5 },
  offerTitle: { fontSize: fontSize.base, color: colors.ink, fontWeight: '800' },
  offerSubtitle: { fontSize: fontSize.sm, color: colors.sub, lineHeight: 18 },
  offerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});

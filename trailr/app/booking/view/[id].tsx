/**
 * Per-booking detail view. The route id here is a booking id, not a trip id.
 */
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useBooking,
  useCancelBooking,
  useConfirmBooking,
  type BookingDetailRow,
} from '@trailr/db';
import { colors, fontSize, radius, shadow, spacing } from '../../../src/theme/tokens';
import { Btn } from '../../../src/components/Btn';
import { Chip } from '../../../src/components/Chip';
import { MapView } from '../../../src/components/MapView';
import { useToast } from '../../../src/components/Toast';
import { Wordmark } from '../../../src/components/Wordmark';
import { moneyThb, nightlyThb } from '../../../src/lib/bookingDisplay';

type DetailRow = { label: string; value: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function metaString(meta: Record<string, unknown> | null, key: string): string | null {
  const value = meta?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function metaNumber(meta: Record<string, unknown> | null, key: string): number | null {
  const value = meta?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metaDisplay(meta: Record<string, unknown> | null, key: string): string | null {
  const value = meta?.[key];
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString();
  return null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function titleFor(booking: BookingDetailRow): string {
  if (booking.title) return booking.title;
  return booking.type === 'flight' ? 'Flight booking' : 'Hotel booking';
}

function providerLabel(provider: string): string {
  return `via ${provider}`;
}

function confirmationValue(booking: BookingDetailRow): string | null {
  if (booking.external_ref) return booking.external_ref;
  const confirmation = asRecord(booking.confirmation);
  return (
    metaString(confirmation, 'external_ref') ??
    metaString(confirmation, 'booking_reference') ??
    metaString(confirmation, 'order_id') ??
    metaString(confirmation, 'id')
  );
}

function buildRows(booking: BookingDetailRow): DetailRow[] {
  const meta = booking.meta;
  const rows: DetailRow[] = [];
  const confirmationRef = confirmationValue(booking);
  const checkIn = metaString(meta, 'check_in');
  const checkOut = metaString(meta, 'check_out');
  const nights = metaDisplay(meta, 'nights');

  rows.push({ label: 'Provider', value: providerLabel(booking.provider) });
  if (confirmationRef) rows.push({ label: 'Confirmation', value: confirmationRef });
  rows.push({ label: 'Booked on', value: formatDate(booking.created_at) });

  if (booking.type === 'hotel') {
    const address = metaString(meta, 'address');
    const hotelId = metaString(meta, 'hotel_id');
    if (address) rows.push({ label: 'Address', value: address });
    if (checkIn || checkOut) rows.push({ label: 'Dates', value: `${checkIn ?? 'Check-in'} to ${checkOut ?? 'Check-out'}` });
    if (nights) rows.push({ label: 'Nights', value: nights });
    if (hotelId) rows.push({ label: 'Hotel id', value: hotelId });
  } else {
    const route = metaString(meta, 'route');
    const airline = metaString(meta, 'airline');
    const departDate = metaString(meta, 'depart_date');
    if (route) rows.push({ label: 'Route', value: route });
    if (airline) rows.push({ label: 'Airline', value: airline });
    if (departDate) rows.push({ label: 'Departure', value: departDate });
  }

  return rows;
}

function confirmCancel(onConfirm: () => void) {
  const message = "Cancel this booking? It will stay in your history, but its status will change to cancelled.";
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) onConfirm();
    return;
  }

  Alert.alert('Cancel booking?', message, [
    { text: 'Keep booking', style: 'cancel' },
    { text: 'Cancel booking', style: 'destructive', onPress: onConfirm },
  ]);
}

function Details({ rows }: { rows: DetailRow[] }) {
  return (
    <View style={styles.rows}>
      {rows.map((row) => (
        <View key={row.label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{row.label}</Text>
          <Text style={styles.detailValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

function BookingDetailContent() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = id ?? '';
  const { data: booking, isLoading, isError } = useBooking(bookingId);
  const confirmBooking = useConfirmBooking(booking?.trip_id ?? undefined);
  const cancelBooking = useCancelBooking(booking?.trip_id ?? undefined);
  const busy = confirmBooking.isPending || cancelBooking.isPending;

  const rows = useMemo(() => (booking ? buildRows(booking) : []), [booking]);
  const latitude = booking ? metaNumber(booking.meta, 'latitude') : null;
  const longitude = booking ? metaNumber(booking.meta, 'longitude') : null;
  const perNight = booking?.type === 'hotel' ? nightlyThb(booking.amount_thb, booking.meta?.['nights']) : null;

  const confirm = () => {
    if (!booking) return;
    confirmBooking.mutate(booking.id, {
      onSuccess: () => toast('Booking confirmed'),
      onError: (error) => toast(`Confirm failed: ${String(error)}`),
    });
  };

  const cancel = () => {
    if (!booking) return;
    confirmCancel(() => {
      cancelBooking.mutate(booking.id, {
        onSuccess: () => toast('Booking cancelled'),
        onError: (error) => toast(`Cancel failed: ${String(error)}`),
      });
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>{'< back'}</Text>
        </TouchableOpacity>
        <View style={styles.spacer} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.acc} size="large" />
        </View>
      ) : isError || !booking ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Booking not found</Text>
          <Text style={styles.emptyCopy}>This booking may have been removed or belongs to another account.</Text>
          <Btn onPress={() => router.back()}>Go back</Btn>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.heroTop}>
              <Chip dot={false}>{booking.type === 'flight' ? 'Flight' : 'Stay'}</Chip>
              <Chip dot={false} accent={booking.status === 'confirmed'}>
                {booking.status}
              </Chip>
            </View>

            <Text style={styles.title}>{titleFor(booking)}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{moneyThb(booking.amount_thb)}</Text>
              {perNight ? <Text style={styles.perNight}>{perNight}</Text> : null}
            </View>

            <Details rows={rows} />

            {latitude != null && longitude != null ? (
              <View style={styles.mapWrap}>
                <MapView
                  initialLatitude={latitude}
                  initialLongitude={longitude}
                  initialZoom={14}
                  posts={[
                    {
                      id: booking.id,
                      latitude,
                      longitude,
                      location: titleFor(booking),
                      caption: booking.status,
                      markerKind: 'planned',
                    },
                  ]}
                >
                  <View style={styles.centerPin} pointerEvents="none">
                    <View style={styles.pinDot} />
                  </View>
                </MapView>
              </View>
            ) : null}

            {booking.trip_id ? (
              <TouchableOpacity
                style={styles.tripLink}
                onPress={() => router.push(`/journal/${booking.trip_id}`)}
                activeOpacity={0.84}
              >
                <Text style={styles.tripLinkText}>Part of a trip</Text>
                <Text style={styles.tripLinkArrow}>View trip</Text>
              </TouchableOpacity>
            ) : null}

            {booking.status !== 'cancelled' ? (
              <View style={styles.actions}>
                {booking.status === 'pending' ? (
                  <Btn solid full onPress={confirm} loading={confirmBooking.isPending} disabled={busy}>
                    Confirm
                  </Btn>
                ) : null}
                <Btn full onPress={cancel} loading={cancelBooking.isPending} disabled={busy}>
                  Cancel
                </Btn>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

export default function BookingDetailScreen() {
  return <BookingDetailContent />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 54,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: { color: colors.sub, fontSize: fontSize.md },
  spacer: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  emptyTitle: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800' },
  emptyCopy: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center' },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.xxl,
  },
  card: {
    gap: spacing.lg,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    ...shadow.sm,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: fontSize.xl, color: colors.ink, fontWeight: '800' },
  priceRow: { gap: spacing.xs },
  price: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800' },
  perNight: { fontSize: fontSize.sm, color: colors.sub },
  rows: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  detailLabel: {
    width: 132,
    fontSize: fontSize.sm,
    color: colors.sub,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    minWidth: 0,
    fontSize: fontSize.sm,
    color: colors.ink,
    lineHeight: 20,
  },
  mapWrap: {
    height: 240,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.map,
  },
  centerPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: radius.circle,
    borderWidth: 3,
    borderColor: colors.acc,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: radius.circle,
    backgroundColor: colors.acc,
  },
  tripLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
  },
  tripLinkText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '700' },
  tripLinkArrow: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '800' },
  actions: { gap: spacing.sm },
});

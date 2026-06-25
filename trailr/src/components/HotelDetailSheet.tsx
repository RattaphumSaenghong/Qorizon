import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import type { BookingOffer, HotelPin } from '@trailr/db';
import { colors, fontSize, radius, shadow, spacing } from '../theme/tokens';
import { Btn } from './Btn';
import { Chip } from './Chip';
import { PressableScale } from './PressableScale';

interface Props {
  visible: boolean;
  hotel: HotelPin | null;
  offer?: BookingOffer;
  tripId?: string | null;
  booking: boolean;
  adding: boolean;
  onBook: () => void;
  onAddToTrip: () => void;
  onClose: () => void;
}

function money(n?: number): string {
  return n == null ? 'Price unavailable' : `${n.toLocaleString()} THB`;
}

function nightly(offer?: BookingOffer): string | null {
  const nights = Number(offer?.meta?.['nights'] ?? 0);
  if (!offer || !Number.isFinite(nights) || nights <= 0) return null;
  return `${Math.round(offer.amount_thb / nights).toLocaleString()} THB/night`;
}

export function HotelDetailSheet({
  visible,
  hotel,
  offer,
  tripId,
  booking,
  adding,
  onBook,
  onAddToTrip,
  onClose,
}: Props) {
  if (!hotel) return null;
  const perNight = nightly(offer);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <PressableScale style={styles.backdrop} onPress={onClose}>
        <PressableScale style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={2}>{hotel.name}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>{hotel.address ?? 'Stay nearby'}</Text>
            </View>
            <PressableScale onPress={onClose}>
              <Text style={styles.close}>x</Text>
            </PressableScale>
          </View>

          <View style={styles.tags}>
            {hotel.rating != null ? <Chip dot={false}>{`Rating ${hotel.rating}`}</Chip> : null}
            {hotel.stars != null ? <Chip dot={false}>{`${hotel.stars} star`}</Chip> : null}
            <Chip dot={false}>{offer ? money(offer.amount_thb) : 'Catalog only'}</Chip>
            {perNight ? <Chip dot={false}>{perNight}</Chip> : null}
          </View>

          <Text style={styles.copy}>
            {offer
              ? 'This rate has already passed Trailr pricing rules.'
              : 'Zoom in or search a smaller area to load live rates for this stay.'}
          </Text>

          <View style={styles.actions}>
            <Btn solid full onPress={onBook} loading={booking} disabled={!offer}>
              Book
            </Btn>
            {tripId ? (
              <Btn full onPress={onAddToTrip} loading={adding}>
                Add to trip
              </Btn>
            ) : null}
          </View>
        </PressableScale>
      </PressableScale>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(44,42,38,0.35)', justifyContent: 'flex-end' },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadow.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleWrap: { flex: 1 },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: fontSize.sm, color: colors.sub, marginTop: 3 },
  close: { fontSize: fontSize.md, color: colors.sub, fontWeight: '800', paddingHorizontal: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  copy: { fontSize: fontSize.sm, color: colors.sub, lineHeight: 20 },
  actions: { gap: spacing.sm },
});

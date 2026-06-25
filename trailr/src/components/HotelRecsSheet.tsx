import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCreateBooking, useHotelRecommendations } from '@trailr/db';
import type { HotelRecommendation } from '@trailr/db';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { colors, fontSize, radius, shadow, spacing } from '../theme/tokens';
import { Btn } from './Btn';
import { Chip } from './Chip';
import { PressableScale } from './PressableScale';

type Sort = 'value' | 'distance' | 'transit';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'value', label: 'Best value' },
  { key: 'distance', label: 'Closest to sights' },
  { key: 'transit', label: 'Nearest station' },
];

interface Props {
  visible: boolean;
  tripId: string;
  firstDate?: string | null;
  lastDate?: string | null;
  onClose: () => void;
  onBooked: () => void;
}

function sortItems(items: HotelRecommendation[], sort: Sort): HotelRecommendation[] {
  const copy = [...items];
  if (sort === 'distance') return copy.sort((a, b) => a.avg_km_to_stops - b.avg_km_to_stops);
  if (sort === 'transit') {
    return copy.sort((a, b) => (a.station_meters ?? Infinity) - (b.station_meters ?? Infinity));
  }
  return copy.sort((a, b) => b.score - a.score);
}

export function HotelRecsSheet({ visible, tripId, firstDate, lastDate, onClose, onBooked }: Props) {
  const [capText, setCapText] = useState('');
  const [sort, setSort] = useState<Sort>('value');
  const [addingId, setAddingId] = useState<string | null>(null);

  // Editable nightly cap re-scores budget; debounce so typing doesn't spam the API.
  const debouncedCap = useDebouncedValue(capText.trim(), 500);
  const capNum = Number(debouncedCap);
  const nightlyCap = debouncedCap !== '' && Number.isFinite(capNum) && capNum > 0 ? Math.round(capNum) : undefined;

  const recsQ = useHotelRecommendations(
    tripId,
    { check_in: firstDate ?? undefined, check_out: lastDate ?? undefined, nightly_cap: nightlyCap },
    visible,
  );
  const data = recsQ.data;
  const createBooking = useCreateBooking(tripId);

  const items = useMemo(() => sortItems(data?.items ?? [], sort), [data, sort]);

  const add = (rec: HotelRecommendation) => {
    setAddingId(rec.offer_id);
    createBooking.mutate(
      {
        type: 'hotel',
        provider: rec.provider,
        trip_id: tripId,
        external_ref: rec.offer_id,
        amount_thb: rec.total_thb,
        title: rec.name,
        meta: {
          nightly_thb: rec.nightly_thb,
          latitude: rec.latitude,
          longitude: rec.longitude,
          ...(rec.station_name ? { station_name: rec.station_name } : {}),
          ...(rec.station_meters != null ? { station_meters: rec.station_meters } : {}),
        },
      },
      { onSuccess: onBooked, onSettled: () => setAddingId(null) },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <PressableScale style={styles.backdrop} onPress={onClose}>
        <PressableScale style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Suggest stays</Text>
              <Text style={styles.subtitle}>
                Ranked for your itinerary{data ? ` · ${data.nights} night${data.nights === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
            <PressableScale onPress={onClose} accessibilityLabel="Close stay suggestions">
              <Text style={styles.close}>x</Text>
            </PressableScale>
          </View>

          <View style={styles.capRow}>
            <View style={styles.capField}>
              <Text style={styles.label}>Nightly budget (THB)</Text>
              <TextInput
                style={styles.input}
                value={capText}
                onChangeText={setCapText}
                keyboardType="numeric"
                placeholder={data?.nightly_cap_thb != null ? `Auto: ${data.nightly_cap_thb.toLocaleString()}` : 'No cap'}
                placeholderTextColor={colors.sub}
              />
            </View>
          </View>

          <View style={styles.sortRow}>
            {SORTS.map((s) => {
              const active = s.key === sort;
              return (
                <PressableScale
                  key={s.key}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  onPress={() => setSort(s.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${s.label}`}
                >
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{s.label}</Text>
                </PressableScale>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {recsQ.isError ? (
              <Text style={styles.errorText}>Could not load suggestions. Check the trip API and try again.</Text>
            ) : recsQ.isFetching && !data ? (
              <ActivityIndicator color={colors.acc} style={styles.loading} />
            ) : data?.multi_area ? (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>Your sights span a wide area</Text>
                <Text style={styles.noticeText}>
                  These stops are too spread out for a single stay to cover well. Try splitting them across
                  day-trips, then suggest stays again.
                </Text>
              </View>
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>
                No stays found near your itinerary. Add a couple of attractions with pins, then try again.
              </Text>
            ) : (
              items.map((rec) => (
                <View key={rec.offer_id} style={styles.card}>
                  <View style={styles.cardMain}>
                    <Text style={styles.cardName} numberOfLines={1}>{rec.name}</Text>
                    <Text style={styles.cardWhy} numberOfLines={3}>{rec.why}</Text>
                    <View style={styles.cardMeta}>
                      <Chip dot={false}>{Math.round(rec.score * 100)}% match</Chip>
                      <Chip dot={false}>{`฿${rec.nightly_thb.toLocaleString()}/night`}</Chip>
                      {rec.rating != null ? <Chip dot={false}>{`★${rec.rating}`}</Chip> : null}
                    </View>
                  </View>
                  <Btn solid sm onPress={() => add(rec)} loading={addingId === rec.offer_id}>
                    Add
                  </Btn>
                </View>
              ))
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
  headerText: { flex: 1 },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: fontSize.sm, color: colors.sub, marginTop: 3 },
  close: { fontSize: fontSize.md, color: colors.sub, fontWeight: '800', paddingHorizontal: spacing.sm },
  capRow: { flexDirection: 'row', gap: spacing.sm },
  capField: { flex: 1, gap: spacing.xs },
  label: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sortChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  sortChipActive: { backgroundColor: colors.acc, borderColor: colors.acc },
  sortChipText: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '700' },
  sortChipTextActive: { color: colors.white },
  content: { gap: spacing.sm, paddingBottom: spacing.sm },
  loading: { paddingVertical: spacing.xl },
  errorText: { fontSize: fontSize.sm, color: '#c0392b', paddingVertical: spacing.md },
  emptyText: { fontSize: fontSize.sm, color: colors.sub, textAlign: 'center', paddingVertical: spacing.lg, lineHeight: 20 },
  notice: { gap: spacing.xs, paddingVertical: spacing.md },
  noticeTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.ink },
  noticeText: { fontSize: fontSize.sm, color: colors.sub, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  cardMain: { flex: 1, gap: 5 },
  cardName: { fontSize: fontSize.base, color: colors.ink, fontWeight: '800' },
  cardWhy: { fontSize: fontSize.sm, color: colors.sub, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});

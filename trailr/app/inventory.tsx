import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useDismissInventoryItem,
  useInventory,
  useMatchInventoryItem,
  useUserTrips,
} from '@trailr/db';
import type { BookingType, InventoryItemRow } from '@trailr/db';
import { Wordmark } from '../src/components/Wordmark';
import { Btn } from '../src/components/Btn';
import { colors, fontSize, radius, spacing } from '../src/theme/tokens';
import { useAuthStore } from '../src/stores/authStore';
import { useToast } from '../src/components/Toast';

function itemTitle(item: InventoryItemRow): string {
  return String(item.parsed.title ?? item.parsed.hotel_name ?? (item.type === 'flight' ? 'Flight confirmation' : 'Hotel confirmation'));
}

function itemDetail(item: InventoryItemRow): string {
  const p = item.parsed;
  if (item.type === 'flight') {
    return [p.origin && p.destination ? `${p.origin} -> ${p.destination}` : null, p.dep_time, p.ref ? `Ref ${p.ref}` : null]
      .filter(Boolean)
      .join(' · ');
  }
  return [p.check_in, p.check_out, p.nights ? `${p.nights} nights` : null, p.ref ? `Ref ${p.ref}` : null]
    .filter(Boolean)
    .join(' · ');
}

export default function InventoryScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { type } = useLocalSearchParams<{ type?: BookingType }>();
  const inventoryType = type === 'flight' || type === 'hotel' ? type : undefined;
  const { data: items = [], isLoading } = useInventory(inventoryType);
  const { data: trips = [] } = useUserTrips(user?.id ?? '');
  const match = useMatchInventoryItem(inventoryType);
  const dismiss = useDismissInventoryItem(inventoryType);

  const matchItem = (item: InventoryItemRow, tripId: string) => {
    match.mutate(
      { id: item.id, tripId },
      { onSuccess: () => toast('Added to trip'), onError: () => toast('Could not add to trip') },
    );
  };

  const dismissItem = (item: InventoryItemRow) => {
    dismiss.mutate(item.id, { onSuccess: () => toast('Dismissed'), onError: () => toast('Could not dismiss') });
  };
  const forwardingAddress = user?.forwarding_token ? `${user.username}-${user.forwarding_token}@in.trailr.app` : null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {!user ? (
        <View style={styles.center}><Text style={styles.empty}>Sign in to view booking confirmations.</Text></View>
      ) : isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.acc} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.forwardBox}>
            <Text style={styles.forwardTitle}>Forward confirmations</Text>
            {forwardingAddress ? (
              <Text style={styles.forwardAddress}>{forwardingAddress}</Text>
            ) : null}
            <Text style={styles.forwardText}>Send flight and hotel emails to your Trailr inbound address, then match them to a trip here.</Text>
          </View>

          {items.length === 0 ? (
            <Text style={styles.empty}>No unmatched confirmations.</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.typePill}><Text style={styles.typePillText}>{item.type}</Text></View>
                  <Text style={styles.received}>{new Date(item.received_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.itemTitle}>{itemTitle(item)}</Text>
                {itemDetail(item) ? <Text style={styles.itemDetail}>{itemDetail(item)}</Text> : null}

                <Text style={styles.sectionLabel}>Add to trip</Text>
                <View style={styles.tripList}>
                  {trips.map((trip) => (
                    <Btn
                      key={trip.id}
                      sm
                      onPress={() => matchItem(item, trip.id)}
                      loading={match.isPending}
                    >
                      {trip.title}
                    </Btn>
                  ))}
                </View>
                <View style={styles.actions}>
                  <Btn sm onPress={() => dismissItem(item)} loading={dismiss.isPending}>Dismiss</Btn>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  },
  back: { color: colors.sub, fontSize: fontSize.md },
  title: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  empty: { fontSize: fontSize.md, color: colors.sub, textAlign: 'center' },
  list: { padding: spacing.xl, gap: spacing.md, alignItems: 'center' },
  forwardBox: {
    width: '100%',
    maxWidth: 720,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  forwardTitle: { fontSize: fontSize.base, color: colors.ink, fontWeight: '800' },
  forwardAddress: { fontSize: fontSize.md, color: colors.ink, fontWeight: '800', marginTop: spacing.xs, fontFamily: 'monospace' },
  forwardText: { fontSize: fontSize.sm, color: colors.sub, marginTop: spacing.xs },
  card: {
    width: '100%',
    maxWidth: 720,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typePill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.accSoft },
  typePillText: { fontSize: fontSize.xs, color: colors.acc, fontWeight: '800' },
  received: { fontSize: fontSize.xs, color: colors.sub },
  itemTitle: { fontSize: fontSize.base, color: colors.ink, fontWeight: '800' },
  itemDetail: { fontSize: fontSize.sm, color: colors.sub },
  sectionLabel: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '800', textTransform: 'uppercase', marginTop: spacing.sm },
  tripList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
});

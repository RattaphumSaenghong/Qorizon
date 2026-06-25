/**
 * Trips tab — "My Trips": the signed-in user's trips. Tap to open the builder;
 * create a new draft. (The deep editor lives at /builder/[id].)
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { tripHref } from '../../src/lib/tripHref';
import { useUserTrips, useMyTripInvites, useRespondInvite } from '@trailr/db';
import type { TripWithAuthor } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { Btn } from '../../src/components/Btn';
import { useAuthStore } from '../../src/stores/authStore';
import { useToast } from '../../src/components/Toast';
import { useResponsive } from '../../src/hooks/useResponsive';

function TripCard({ trip, onOpen, cardStyle }: { trip: TripWithAuthor; onOpen: () => void; cardStyle?: ViewStyle }) {
  const statusColor =
    trip.status === 'active' ? colors.acc : trip.status === 'draft' ? colors.sub : colors.line;
  const statusLabel =
    trip.status === 'active' ? '● LIVE' : trip.status === 'draft' ? 'Draft' : 'Completed';
  return (
    <TouchableOpacity style={[styles.card, cardStyle]} onPress={onOpen} activeOpacity={0.88}>
      <View style={styles.cover}>
        {trip.cover_image_url ? (
          <Image source={{ uri: trip.cover_image_url }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <Text style={styles.coverLabel}>[ cover ]</Text>
        )}
        {trip.live_mode && (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{trip.title}</Text>
        <View style={styles.footer}>
          <Text style={[styles.status, { color: statusColor }]}>{statusLabel}</Text>
          {trip.fork_count > 0 && <Text style={styles.forks}>⑂ {trip.fork_count}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const router = useRouter();
  const { isPhone } = useResponsive();
  const user = useAuthStore((s) => s.user);
  const { data: trips = [], isLoading } = useUserTrips(user?.id ?? '');

  const openTrip = (t: { id: string; stage?: string }) => {
    router.push(tripHref(t));
  };

  const toast = useToast();
  const { data: invites = [] } = useMyTripInvites();
  const respond = useRespondInvite();

  const goTab = (tab: string) => {
    if (tab === 'Feed') router.push('/(tabs)/');
    if (tab === 'Explore') router.push('/(tabs)/explore');
    if (tab === 'Saved') router.push('/(tabs)/saved');
    if (tab === 'Book') router.push('/(tabs)/book');
  };

  return (
    <View style={styles.root}>
      <TopBar active="Trips" onTabPress={goTab} />

      <View style={styles.header}>
        <Text style={styles.heading}>My Trips</Text>
        <View style={{ flex: 1 }} />
        {user && (
          <Btn solid sm onPress={() => router.push('/new-trip')}>＋ New trip</Btn>
        )}
      </View>

      {user && invites.length > 0 && (
        <View style={styles.invites}>
          <Text style={styles.invitesTitle}>Trip invites</Text>
          {invites.map((inv) => (
            <View key={inv.id} style={styles.inviteRow}>
              <Text style={styles.inviteText} numberOfLines={1}>
                <Text style={styles.inviteWho}>{inv.inviter?.display_name ?? inv.inviter?.username ?? 'Someone'}</Text>
                {' invited you to '}
                <Text style={styles.inviteWho}>{inv.trip.destination ?? inv.trip.title}</Text>
              </Text>
              <Btn sm onPress={() => respond.mutate({ tripId: inv.trip_id, status: 'declined' })}>Decline</Btn>
              <Btn
                solid
                sm
                onPress={() =>
                  respond.mutate(
                    { tripId: inv.trip_id, status: 'accepted' },
                    { onSuccess: () => toast('Joined the trip!') },
                  )
                }
              >
                Accept
              </Btn>
            </View>
          ))}
        </View>
      )}

      {!user ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sign in to see and build your trips.</Text>
          <Btn sm onPress={() => router.push('/sign-in')}>Sign in</Btn>
        </View>
      ) : isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.acc} size="large" />
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No trips yet. Create one or fork a trip you like.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.grid, isPhone && styles.gridPhone]}>
          {trips.map((t) => (
            <TripCard key={t.id} trip={t} onOpen={() => openTrip(t)} cardStyle={isPhone ? styles.cardPhone : undefined} />
          ))}
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
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  heading: { fontSize: fontSize.xl, fontWeight: '800', color: colors.ink },
  invites: {
    backgroundColor: colors.accSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  invitesTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.acc, textTransform: 'uppercase', letterSpacing: 0.5 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inviteText: { flex: 1, fontSize: fontSize.md, color: colors.ink },
  inviteWho: { fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  emptyText: { fontSize: fontSize.md, color: colors.sub, textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  gridPhone: { padding: spacing.lg, gap: spacing.md },
  cardPhone: { width: '100%' },
  card: {
    width: 260,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  cover: {
    height: 150,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  livePill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.acc,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  liveText: { fontSize: fontSize.xs, color: colors.white, fontWeight: '700' },
  meta: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  status: { fontSize: fontSize.sm, fontWeight: '600' },
  forks: { fontSize: fontSize.sm, color: colors.sub },
});

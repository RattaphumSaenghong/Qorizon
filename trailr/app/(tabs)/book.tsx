import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TopBar } from '../../src/components/TopBar';
import { colors, fontSize, radius, shadow, spacing } from '../../src/theme/tokens';

function routeWithTrip(path: string, tripId?: string): string {
  return tripId ? `${path}?tripId=${encodeURIComponent(tripId)}` : path;
}

export default function BookTabScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = typeof params.tripId === 'string' ? params.tripId : undefined;

  const goTab = (tab: string) => {
    if (tab === 'Feed') router.push('/(tabs)/');
    if (tab === 'Explore') router.push('/(tabs)/explore');
    if (tab === 'Trips') router.push('/(tabs)/trips');
    if (tab === 'Saved') router.push('/(tabs)/saved');
    if (tab === 'Book') router.push('/(tabs)/book');
  };

  return (
    <View style={styles.root}>
      <TopBar active="Book" onTabPress={goTab} />
      <View style={styles.body}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(routeWithTrip('/book/flights', tripId))}
          activeOpacity={0.86}
        >
          <Text style={styles.icon}>Flight</Text>
          <Text style={styles.title}>Flights</Text>
          <Text style={styles.copy}>Search fares and save bookings into Trailr.</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(routeWithTrip('/book/stays', tripId))}
          activeOpacity={0.86}
        >
          <Text style={styles.icon}>Stay</Text>
          <Text style={styles.title}>Stays</Text>
          <Text style={styles.copy}>Browse hotels on a map and book live rates.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: {
    flex: 1,
    padding: spacing.xxl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  card: {
    width: 320,
    minHeight: 220,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow.sm,
  },
  icon: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: fontSize.xl, color: colors.ink, fontWeight: '800' },
  copy: { fontSize: fontSize.md, color: colors.sub, lineHeight: 22 },
});

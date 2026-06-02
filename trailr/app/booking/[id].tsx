/**
 * One-Click Booking — BookA: inline in trip (flight + hotels + map)
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { MapView, MapPin } from '../../src/components/MapView';

function HotelRow({ accent = false }: { accent?: boolean }) {
  return (
    <View style={[styles.hotelRow, accent && styles.hotelRowAccent]}>
      <View style={styles.hotelPhoto}>
        <Text style={styles.hotelPhotoLabel}>[ hotel ]</Text>
      </View>
      <View style={styles.hotelMeta}>
        <View style={[styles.bar, { width: '60%' }]} />
        <View style={styles.hotelTags}>
          <Chip dot={false}>★ 8.9</Chip>
          <Chip dot={false}>0.4km to Day 3</Chip>
        </View>
        <View style={[styles.bar, { width: '80%' }]} />
      </View>
      <View style={styles.hotelPrice}>
        <Text style={styles.priceText}>฿2,400</Text>
        <Btn solid sm>Book</Btn>
      </View>
    </View>
  );
}

export default function BookingScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      {/* header */}
      <View style={styles.header}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Japan trip</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Add stays & flights</Text>
        <View style={styles.spacer} />
        <Chip dot={false}>Day 1–7</Chip>
      </View>

      <View style={styles.body}>
        {/* ── Left: booking column ── */}
        <ScrollView style={styles.bookingCol} contentContainerStyle={styles.bookingContent}>
          {/* flight card */}
          <View style={styles.flightCard}>
            <Text style={styles.flightIcon}>✈</Text>
            <View style={styles.flightInfo}>
              <Text style={styles.flightRoute}>BKK → KIX</Text>
              <Text style={styles.flightSub}>1 May · 1 stop · 7h 20m</Text>
            </View>
            <View style={styles.spacer} />
            <View style={styles.flightPrice}>
              <Text style={styles.priceText}>฿9,800</Text>
              <Text style={styles.amadeusLabel}>via Amadeus</Text>
            </View>
            <Btn solid sm>Book</Btn>
          </View>

          {/* hotels header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stays near your route</Text>
            <View style={styles.spacer} />
            <Chip dot={false} accent>Agoda</Chip>
            <Chip dot={false}>Booking.com</Chip>
          </View>

          <HotelRow accent />
          <HotelRow />
          <HotelRow />
        </ScrollView>

        {/* ── Right: map ── */}
        <View style={styles.mapCol}>
          <MapView initialLongitude={135.7681} initialLatitude={35.0116} initialZoom={13}>
            <MapPin x="40%" y="42%" label="A" accent size={26} />
            <MapPin x="58%" y="34%" label="B" size={26} />
            <MapPin x="50%" y="58%" label="C" size={26} />
            <View style={styles.mapLegend}>
              <View style={[styles.legendDot, { backgroundColor: colors.acc }]} />
              <Text style={styles.legendText}>= your Day 3 stops</Text>
            </View>
          </MapView>
        </View>
      </View>
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
    flexShrink: 0,
  },
  back: { color: colors.sub, fontSize: fontSize.md },
  pageTitle: { fontSize: 20, color: colors.ink },
  spacer: { flex: 1 },
  body: { flex: 1, flexDirection: 'row' },
  bookingCol: { width: 560, borderRightWidth: 1, borderRightColor: colors.line },
  bookingContent: { padding: spacing.xl, gap: spacing.md },
  flightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  flightIcon: { fontSize: 22 },
  flightInfo: { gap: 5 },
  flightRoute: { fontSize: 17, color: colors.ink },
  flightSub: { fontSize: fontSize.sm, color: colors.sub },
  flightPrice: { alignItems: 'flex-end', gap: 2 },
  amadeusLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: 18 },
  hotelRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  hotelRowAccent: { borderColor: colors.acc },
  hotelPhoto: {
    width: 110,
    height: 90,
    backgroundColor: colors.panel,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelPhotoLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  hotelMeta: { flex: 1, justifyContent: 'center', gap: 6 },
  hotelTags: { flexDirection: 'row', gap: 6 },
  bar: { height: 9, backgroundColor: colors.bar, borderRadius: 5 },
  hotelPrice: { alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  priceText: { fontSize: 18, color: colors.ink, fontWeight: '600' },
  mapCol: { flex: 1 },
  mapLegend: {
    position: 'absolute',
    right: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: fontSize.sm },
});

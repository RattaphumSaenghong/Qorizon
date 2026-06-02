/**
 * Explore screen â€” FeedC: masonry photo grid + right context rail
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';
import { Chip } from '../../src/components/Chip';
import { Avatar } from '../../src/components/Avatar';
import { Btn } from '../../src/components/Btn';
import { MapView, MapPin } from '../../src/components/MapView';

const CATEGORIES = ['Trending', 'Thailand', 'Japan', 'Food', 'Hidden gems'];

const GRID_ITEMS = [
  { span: true, label: '[ photo ]' },
  { label: '' }, { label: '' },
  { label: '' }, { label: '[ reel ]' },
  { label: '' }, { label: '' },
  { label: '' }, { label: '' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('Trending');

  return (
    <View style={styles.root}>
      <TopBar
        active="Explore"
        onTabPress={(tab) => {
          if (tab === 'Feed') router.push('/(tabs)/');
          if (tab === 'Trips') router.push('/(tabs)/trips');
          if (tab === 'Saved') router.push('/(tabs)/saved');
        }}
      />
      <View style={styles.body}>
        {/* â”€â”€ Center: masonry grid â”€â”€ */}
        <ScrollView style={styles.gridCol} contentContainerStyle={styles.gridContent}>
          <View style={styles.categories}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c} onPress={() => setActiveCategory(c)}>
                <Chip dot={false} accent={c === activeCategory}>{c}</Chip>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.grid}>
            {GRID_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.gridItem, item.span && styles.gridItemSpan]}
                activeOpacity={0.8}
              >
                <View style={styles.gridPhoto}>
                  {item.label ? (
                    <Text style={styles.gridLabel}>{item.label}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* â”€â”€ Right: context rail â”€â”€ */}
        <View style={styles.rail}>
          <View style={styles.railAuthor}>
            <Avatar size={36} ring />
            <View style={styles.railAuthorMeta}>
              <View style={[styles.bar, { width: 120 }]} />
              <View style={[styles.bar, { width: 80, marginTop: 5 }]} />
            </View>
          </View>
          <View style={styles.selectedPhoto}>
            <Text style={styles.photoLabel}>[ selected post ]</Text>
          </View>
          <View style={styles.miniMapWrap}>
            <MapView initialLongitude={100.4888} initialLatitude={13.7457} initialZoom={13} style={{ height: 130 }}>
              <MapPin x="50%" y="55%" accent size={20} />
            </MapView>
          </View>
          <Btn solid full sm>Save to a trip</Btn>
          <Text style={styles.nearByTitle}>More near here</Text>
          <View style={styles.nearByRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.nearByThumb} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, flexDirection: 'row' },
  gridCol: { flex: 1 },
  gridContent: { padding: spacing.xl, gap: spacing.md },
  categories: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridItemSpan: {
    width: '48%',
    aspectRatio: 1,
  },
  gridPhoto: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  rail: {
    width: 360,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    backgroundColor: colors.panel,
    padding: spacing.lg + 2,
    gap: spacing.md,
  },
  railAuthor: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  railAuthorMeta: { flex: 1 },
  bar: { height: 9, backgroundColor: colors.bar, borderRadius: 5 },
  selectedPhoto: {
    height: 200,
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: { fontSize: fontSize.sm, color: colors.sub, fontFamily: 'monospace' },
  miniMapWrap: { height: 130, borderRadius: 8, overflow: 'hidden' },
  nearByTitle: { fontSize: fontSize.md, color: colors.sub },
  nearByRow: { flexDirection: 'row', gap: 8 },
  nearByThumb: { flex: 1, height: 64, backgroundColor: colors.paper, borderRadius: 6, borderWidth: 1, borderColor: colors.line },
});


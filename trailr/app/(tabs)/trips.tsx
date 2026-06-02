/**
 * Trips screen — BuildA: Canva-style trip builder
 * Blocks library | Canvas blueprint | Inspector panel
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize } from '../../src/theme/tokens';
import { Wordmark } from '../../src/components/Wordmark';
import { Chip } from '../../src/components/Chip';
import { Btn } from '../../src/components/Btn';
import { Avatar } from '../../src/components/Avatar';

const BLOCKS = [
  { g: '◷', label: 'Day' },
  { g: '⚲', label: 'Place' },
  { g: '✈', label: 'Flight' },
  { g: '⌂', label: 'Hotel' },
  { g: '✎', label: 'Note' },
  { g: '▦', label: 'Photo' },
  { g: '฿', label: 'Budget' },
];

function BlockChip({ g, label }: { g: string; label: string }) {
  return (
    <TouchableOpacity style={styles.blockChip} activeOpacity={0.75}>
      <View style={styles.blockIcon}>
        <Text style={styles.blockGlyph}>{g}</Text>
      </View>
      <Text style={styles.blockLabel}>{label}</Text>
      <View style={styles.blockSpacer} />
      <Text style={styles.dragHandle}>⠿</Text>
    </TouchableOpacity>
  );
}

function StopCard() {
  return (
    <View style={styles.stopCard}>
      <View style={styles.stopPhoto}>
        <Text style={styles.stopPhotoLabel}>[ place ]</Text>
      </View>
      <View style={styles.stopMeta}>
        <View style={[styles.bar, { width: '70%' }]} />
        <Chip dot accent style={styles.stopTime}>9:00 · 1.5 hrs</Chip>
        <View style={[styles.bar, { width: '90%' }]} />
      </View>
    </View>
  );
}

export default function TripsScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      {/* Editor toolbar */}
      <View style={styles.toolbar}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.push('/(tabs)/')}>
          <Text style={styles.back}>‹ back</Text>
        </TouchableOpacity>
        <View style={styles.tripTitlePlaceholder} />
        <View style={styles.spacer} />
        <Chip dot={false}>Auto-saved</Chip>
        <Btn sm>Preview</Btn>
        <Btn solid sm>Publish trip</Btn>
        <Avatar size={34} ring />
      </View>

      <View style={styles.body}>
        {/* ── Left: block library ── */}
        <View style={styles.blocksPanel}>
          <Text style={styles.panelLabel}>DRAG BLOCKS IN</Text>
          {BLOCKS.map((b) => (
            <BlockChip key={b.label} g={b.g} label={b.label} />
          ))}
        </View>

        {/* ── Center: canvas ── */}
        <ScrollView style={styles.canvas} contentContainerStyle={styles.canvasContent}>
          <View style={styles.dayHeader}>
            <View style={styles.dayCircle}>
              <Text style={styles.dayNum}>3</Text>
            </View>
            <Text style={styles.dayTitle}>Day 3 — Kyoto</Text>
          </View>
          <StopCard />
          <StopCard />
          {/* drop zone */}
          <View style={styles.dropZone}>
            <Text style={styles.dropZoneText}>+ drop a place, note or flight here</Text>
          </View>
        </ScrollView>

        {/* ── Right: inspector ── */}
        <View style={styles.inspector}>
          <Text style={styles.panelLabel}>SELECTED BLOCK</Text>
          <View style={styles.inspectorPhoto}>
            <Text style={styles.stopPhotoLabel}>[ cover photo ]</Text>
          </View>
          <View style={[styles.bar, { width: '60%' }]} />
          <View style={styles.inspectorTimes}>
            <Chip dot={false}>Start 9:00</Chip>
            <Chip dot={false}>1.5 hrs</Chip>
          </View>
          <View style={styles.notes}>
            <View style={styles.bar} />
            <View style={styles.bar} />
            <View style={[styles.bar, { width: '50%' }]} />
          </View>
          <Btn full sm>＋ Add to booking</Btn>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  toolbar: {
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
  tripTitlePlaceholder: { height: 10, width: 220, backgroundColor: colors.bar, borderRadius: 5 },
  spacer: { flex: 1 },
  body: { flex: 1, flexDirection: 'row' },

  blocksPanel: {
    width: 210,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    backgroundColor: colors.panel,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  panelLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace', letterSpacing: 0.5 },
  blockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 9,
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  blockIcon: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accSoft,
    borderWidth: 1.5,
    borderColor: colors.acc,
    borderRadius: 6,
  },
  blockGlyph: { fontSize: 14 },
  blockLabel: { fontSize: fontSize.md, color: colors.ink, flex: 1 },
  blockSpacer: { flex: 1 },
  dragHandle: { color: colors.sub, fontSize: 14 },

  canvas: { flex: 1 },
  canvasContent: {
    padding: spacing.xxl,
    gap: spacing.md,
    maxWidth: 560,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 4 },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { color: colors.white, fontSize: fontSize.base, fontWeight: '700' },
  dayTitle: { fontSize: 22 },

  stopCard: {
    flexDirection: 'row',
    gap: 12,
    padding: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stopPhoto: {
    width: 84,
    height: 84,
    backgroundColor: colors.panel,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPhotoLabel: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
  stopMeta: { flex: 1, justifyContent: 'center', gap: 7 },
  stopTime: { alignSelf: 'flex-start' },
  bar: { height: 9, backgroundColor: colors.bar, borderRadius: 5 },

  dropZone: {
    height: 60,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneText: { fontSize: fontSize.md, color: colors.sub },

  inspector: {
    width: 280,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  inspectorPhoto: {
    height: 130,
    backgroundColor: colors.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorTimes: { flexDirection: 'row', gap: spacing.sm },
  notes: { gap: 8 },
});

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { findAirport, popularAirports, searchAirports } from '../lib/airports';
import type { Airport } from '../lib/airports';
import { colors, fontSize, radius, shadow, spacing } from '../theme/tokens';

interface Props {
  value: string;
  onChange: (iata: string) => void;
  label: string;
}

export function AirportInput({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = findAirport(value);
  const results = query.trim().length > 0 ? searchAirports(query) : popularAirports();

  const pick = (airport: Airport) => {
    onChange(airport.iata);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        {selected ? (
          <View style={styles.triggerRow}>
            <Text style={styles.triggerCode}>{selected.iata}</Text>
            <Text style={styles.triggerCity} numberOfLines={1}>{selected.city}</Text>
          </View>
        ) : value ? (
          <Text style={styles.triggerCode}>{value}</Text>
        ) : (
          <Text style={styles.triggerPlaceholder}>Select airport</Text>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable hitSlop={8} onPress={() => setOpen(false)}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search city or airport code"
              placeholderTextColor={colors.sub}
              autoFocus
              autoCorrect={false}
              spellCheck={false}
            />

            {query.trim().length === 0 ? <Text style={styles.sectionLabel}>Popular</Text> : null}

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {results.length === 0 ? (
                <Text style={styles.noResults}>No airports match “{query.trim()}”.</Text>
              ) : (
                results.map((airport) => {
                  const active = airport.iata === value;
                  return (
                    <Pressable
                      key={airport.iata}
                      style={({ pressed }) => [styles.item, (pressed || active) && styles.itemActive]}
                      onPress={() => pick(airport)}
                    >
                      <Text style={styles.itemCode}>{airport.iata}</Text>
                      <View style={styles.itemMain}>
                        <Text style={styles.itemCity} numberOfLines={1}>{airport.city}</Text>
                        <Text style={styles.itemName} numberOfLines={1}>{airport.name}</Text>
                      </View>
                      <Text style={styles.itemCountry} numberOfLines={1}>{airport.country}</Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, minWidth: 160, gap: spacing.xs },
  label: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '800', textTransform: 'uppercase' },
  trigger: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    minHeight: 42,
  },
  triggerRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  triggerCode: { fontSize: fontSize.md, color: colors.ink, fontWeight: '800' },
  triggerCity: { fontSize: fontSize.sm, color: colors.sub, flexShrink: 1 },
  triggerPlaceholder: { fontSize: fontSize.md, color: colors.sub },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,42,38,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '80%',
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: fontSize.lg, color: colors.ink, fontWeight: '800', textTransform: 'capitalize' },
  close: { fontSize: fontSize.lg, color: colors.sub, fontWeight: '700' },
  search: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    color: colors.ink,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    outlineStyle: 'none',
  } as object,
  sectionLabel: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '800', textTransform: 'uppercase' },
  list: { flexGrow: 0 },
  noResults: { fontSize: fontSize.sm, color: colors.sub, paddingVertical: spacing.lg, textAlign: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  itemActive: { backgroundColor: colors.accSoft },
  itemCode: { fontSize: fontSize.sm, fontWeight: '800', color: colors.acc, width: 40 },
  itemMain: { flex: 1, minWidth: 0, gap: 2 },
  itemCity: { fontSize: fontSize.md, color: colors.ink, fontWeight: '600' },
  itemName: { fontSize: fontSize.xs, color: colors.sub },
  itemCountry: { fontSize: fontSize.xs, color: colors.sub, maxWidth: 90, textAlign: 'right' },
});

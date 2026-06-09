/**
 * New Trip — setup page (stage 1 of 3: planning).
 * Choose destination, dates and an optional budget, then drop into the planning board.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { createTrip } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../src/theme/tokens';
import { Wordmark } from '../src/components/Wordmark';
import { Btn } from '../src/components/Btn';
import { PressableScale } from '../src/components/PressableScale';
import { useAuthStore } from '../src/stores/authStore';
import { useToast } from '../src/components/Toast';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function NewTripScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const [destination, setDestination] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Sign in to plan a trip.</Text>
        <Btn sm onPress={() => router.replace('/sign-in')}>Sign in</Btn>
      </View>
    );
  }

  const create = async () => {
    const dest = destination.trim();
    if (!dest || submitting) return;
    const budgetNum = budget.trim() ? parseInt(budget.replace(/[^0-9]/g, ''), 10) : null;
    setSubmitting(true);
    try {
      const trip = await createTrip({
        user_id: user.id,
        title: dest,
        destination: dest,
        description: null,
        cover_image_url: null,
        status: 'draft',
        stage: 'planning',
        budget: Number.isFinite(budgetNum as number) ? (budgetNum as number) : null,
        budget_currency: 'THB',
        live_mode: false,
        live_cadence: 'daily',
        visibility: 'private',
        forked_from_id: null,
        start_date: DATE_RE.test(start.trim()) ? start.trim() : null,
        end_date: DATE_RE.test(end.trim()) ? end.trim() : null,
        album_overrides: null,
      });
      toast('Trip created — start planning!');
      router.replace(`/builder/${trip.id}`);
    } catch (e) {
      toast('Could not create trip — please try again');
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Wordmark size={22} />
        <PressableScale onPress={() => router.back()}>
          <Text style={styles.back}>‹ back</Text>
        </PressableScale>
        <View style={styles.separator} />
        <Text style={styles.title}>New trip</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Where are you headed?</Text>
          <Text style={styles.cardSub}>Stage 1 of 3 · Planning</Text>

          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tokyo, Japan"
            placeholderTextColor={colors.sub}
            value={destination}
            onChangeText={setDestination}
            autoFocus
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Start date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.sub}
                value={start}
                onChangeText={setStart}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>End date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.sub}
                value={end}
                onChangeText={setEnd}
              />
            </View>
          </View>

          <Text style={styles.label}>Budget (optional)</Text>
          <View style={styles.budgetRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. 40000"
              placeholderTextColor={colors.sub}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />
            <View style={styles.currency}><Text style={styles.currencyText}>THB</Text></View>
          </View>

          <Btn solid full onPress={create} loading={submitting} disabled={!destination.trim()} style={styles.createBtn}>
            Create trip
          </Btn>
          <Text style={styles.hint}>You'll add stops, dates and friends on the planning board next.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.paper },
  muted: { color: colors.sub, fontSize: fontSize.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: { color: colors.sub, fontSize: fontSize.sm },
  separator: { width: 1, height: 20, backgroundColor: colors.line, marginHorizontal: 4 },
  title: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },

  body: { padding: spacing.xl, alignItems: 'center' },
  card: { width: '100%', maxWidth: 520, gap: spacing.sm },
  cardTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.ink },
  cardSub: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600', marginBottom: spacing.md },

  label: { fontSize: fontSize.sm, color: colors.sub, marginTop: spacing.md, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.panel,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  currency: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
  },
  currencyText: { fontSize: fontSize.md, color: colors.sub, fontWeight: '600' },
  createBtn: { marginTop: spacing.xl },
  hint: { fontSize: fontSize.xs, color: colors.sub, textAlign: 'center', marginTop: spacing.sm },
});

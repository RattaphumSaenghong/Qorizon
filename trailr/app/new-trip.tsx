/**
 * New Trip — setup page (stage 1 of 3: planning).
 * Choose destination, dates and an optional budget, then drop into the planning board.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { DateRangePicker } from '../src/components/DateRangePicker';
import { useRouter } from 'expo-router';
import { useCreateTrip, ApiError } from '@trailr/db';
import type { TransportMode } from '@trailr/db';
import { colors, spacing, fontSize, radius } from '../src/theme/tokens';
import { Wordmark } from '../src/components/Wordmark';
import { Btn } from '../src/components/Btn';
import { PressableScale } from '../src/components/PressableScale';
import { useAuthStore } from '../src/stores/authStore';
import { useToast } from '../src/components/Toast';
import { tripHref } from '../src/lib/tripHref';
import { todayYMD } from '../src/lib/date';

type TripMode = 'plan' | 'log';

const TRANSPORT_OPTIONS: Array<{ value: TransportMode; label: string }> = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'train', label: 'Train' },
  { value: 'transit', label: 'Transit' },
  { value: 'car', label: 'Car' },
  { value: 'walk', label: 'Walk' },
];

export default function NewTripScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const createTripMut = useCreateTrip();

  const [destination, setDestination] = useState('');
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<TripMode>('plan');
  const [transportMode, setTransportMode] = useState<TransportMode>('mixed');
  const today = todayYMD();
  const isLogging = mode === 'log';

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
      const trip = await createTripMut.mutateAsync({
        user_id: user.id,
        title: dest,
        destination: dest,
        description: null,
        cover_image_url: null,
        status: isLogging ? 'completed' : 'draft',
        stage: 'planning',
        transport_mode: transportMode,
        budget: Number.isFinite(budgetNum as number) ? (budgetNum as number) : null,
        budget_currency: 'THB',
        live_mode: false,
        live_cadence: 'daily',
        visibility: 'private',
        forked_from_id: null,
        start_date: start,
        end_date: end,
        backdated: isLogging,
      });
      toast(isLogging ? 'Past trip created - add your stops.' : 'Trip created - start planning!');
      router.replace(tripHref(trip));
    } catch (e) {
      // Surface validation errors (e.g. date range too long / inverted) so the
      // user knows what to fix; fall back to a generic message otherwise.
      const msg =
        e instanceof ApiError && e.status === 400
          ? e.message
          : 'Could not create trip — please try again';
      toast(msg);
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
          <View style={styles.modeToggle}>
            <PressableScale
              style={[styles.modeBtn, mode === 'plan' && styles.modeBtnActive]}
              onPress={() => { setMode('plan'); setStart(null); setEnd(null); }}
            >
              <Text style={[styles.modeText, mode === 'plan' && styles.modeTextActive]}>Plan a trip</Text>
            </PressableScale>
            <PressableScale
              style={[styles.modeBtn, mode === 'log' && styles.modeBtnActive]}
              onPress={() => { setMode('log'); setStart(null); setEnd(null); }}
            >
              <Text style={[styles.modeText, mode === 'log' && styles.modeTextActive]}>Log a past trip</Text>
            </PressableScale>
          </View>

          <Text style={styles.cardTitle}>{isLogging ? 'Where did you go?' : 'Where are you headed?'}</Text>
          <Text style={styles.cardSub}>{isLogging ? 'Logging a past trip' : 'Stage 1 of 3 - Planning'}</Text>

          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tokyo, Japan"
            placeholderTextColor={colors.sub}
            value={destination}
            onChangeText={setDestination}
            autoFocus
          />

          <Text style={styles.label}>Dates (optional)</Text>
          <DateRangePicker
            startDate={start}
            endDate={end}
            onChange={(s, e) => { setStart(s); setEnd(e); }}
            minDate={isLogging ? undefined : today}
            maxDate={isLogging ? today : undefined}
          />

          <Text style={styles.label}>Getting around</Text>
          <View style={styles.transportGrid}>
            {TRANSPORT_OPTIONS.map((opt) => {
              const active = transportMode === opt.value;
              return (
                <PressableScale
                  key={opt.value}
                  style={[styles.transportChip, active && styles.transportChipActive]}
                  onPress={() => setTransportMode(opt.value)}
                >
                  <Text style={[styles.transportChipText, active && styles.transportChipTextActive]}>
                    {opt.label}
                  </Text>
                </PressableScale>
              );
            })}
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
            {isLogging ? 'Create logged trip' : 'Create trip'}
          </Btn>
          <Text style={styles.hint}>
            {isLogging
              ? "You'll add past stops in the builder, then publish it as an album."
              : "You'll add stops, dates and friends on the planning board next."}
          </Text>
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
  modeToggle: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    marginBottom: spacing.md,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  modeBtnActive: { backgroundColor: colors.paper },
  modeText: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '700' },
  modeTextActive: { color: colors.ink },
  cardTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.ink },
  cardSub: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600', marginBottom: spacing.md },

  label: { fontSize: fontSize.sm, color: colors.sub, marginTop: spacing.md, fontWeight: '600' },
  transportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  transportChip: {
    minWidth: 88,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  transportChipActive: { borderColor: colors.acc, backgroundColor: colors.accSoft },
  transportChipText: { fontSize: fontSize.sm, color: colors.sub, fontWeight: '700' },
  transportChipTextActive: { color: colors.ink },
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

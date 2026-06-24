/**
 * PaidByControl — single-select "who paid" picker for a stop's cost (settle-up).
 * Mirrors WhoForControl's chip style. Defaults to the current user; only render
 * when members.length > 1 (solo trips have no one to settle with).
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { PressableScale } from './PressableScale';
import type { AssigneeMember } from './WhoForControl';
import { colors, fontSize, spacing, radius } from '../theme/tokens';

interface Props {
  members: AssigneeMember[];
  paidBy: string | null; // null → defaults to currentUserId
  onChange: (id: string) => void;
  currentUserId?: string;
}

export function PaidByControl({ members, paidBy, onChange, currentUserId }: Props) {
  if (members.length < 2) return null;

  const selected = paidBy ?? currentUserId ?? null;

  return (
    <View style={styles.root}>
      <Text style={styles.label}>Who paid?</Text>
      <View style={styles.row}>
        {members.map((m) => {
          const active = selected === m.id;
          const label = m.id === currentUserId ? 'You' : m.display_name ?? m.username;
          return (
            <PressableScale
              key={m.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(m.id)}
            >
              {m.avatar_url ? (
                <Image source={{ uri: m.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{(label[0] ?? '?').toUpperCase()}</Text>
                </View>
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  label: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  chipActive: { borderColor: colors.acc, backgroundColor: colors.accSoft },
  chipText: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '600' },
  chipTextActive: { color: colors.acc },
  avatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.panel },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 10, fontWeight: '700', color: colors.sub },
});

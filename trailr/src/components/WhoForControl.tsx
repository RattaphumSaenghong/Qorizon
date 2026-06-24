/**
 * WhoForControl — multi-select assignee picker for logistics blocks.
 * Shows "Everyone" + member chips; selecting members switches scope to "assigned".
 * Only render when members.length > 1 (solo trips see no scope UI).
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, fontSize, spacing, radius } from '../theme/tokens';

export interface AssigneeMember {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  members: AssigneeMember[];
  assigneeIds: string[];
  onChange: (ids: string[]) => void;
  currentUserId?: string;
}

export function WhoForControl({ members, assigneeIds, onChange, currentUserId }: Props) {
  if (members.length < 2) return null;

  const isEveryone = assigneeIds.length === 0;

  const toggle = (id: string) => {
    if (assigneeIds.includes(id)) {
      const next = assigneeIds.filter((x) => x !== id);
      onChange(next); // if empty → back to Everyone
    } else {
      onChange([...assigneeIds, id]);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>Who's this for?</Text>
      <View style={styles.row}>
        <PressableScale
          style={[styles.chip, isEveryone && styles.chipActive]}
          onPress={() => onChange([])}
        >
          <Text style={[styles.chipText, isEveryone && styles.chipTextActive]}>Everyone</Text>
        </PressableScale>

        {members.map((m) => {
          const active = assigneeIds.includes(m.id);
          const label = m.id === currentUserId ? 'You' : m.display_name ?? m.username;
          return (
            <PressableScale
              key={m.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(m.id)}
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

/**
 * MemberSwitcher — avatar chips to pick whose album/trail to view on a shared
 * trip. Hidden when there's only one contributor (the solo-trip case).
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { PressableScale } from './PressableScale';
import { colors, fontSize, spacing, radius } from '../theme/tokens';

export interface SwitcherMember {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function MemberSwitcher({
  members,
  selectedId,
  onSelect,
  currentUserId,
}: {
  members: SwitcherMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentUserId?: string;
}) {
  if (members.length < 2) return null;
  return (
    <View style={styles.row}>
      {members.map((m) => {
        const active = m.id === selectedId;
        const label = m.id === currentUserId ? 'You' : m.display_name ?? m.username;
        return (
          <PressableScale
            key={m.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(m.id)}
            accessibilityLabel={`View ${label}'s memories`}
          >
            {m.avatar_url ? (
              <Image source={{ uri: m.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{(label[0] ?? '?').toUpperCase()}</Text>
              </View>
            )}
            <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>{label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  chipActive: { borderColor: colors.acc, backgroundColor: colors.accSoft },
  avatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.panel },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 11, fontWeight: '700', color: colors.sub },
  name: { fontSize: fontSize.xs, color: colors.sub, fontWeight: '600', maxWidth: 90 },
  nameActive: { color: colors.acc },
});

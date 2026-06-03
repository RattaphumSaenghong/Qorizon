import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, TOP_BAR_H } from '../theme/tokens';
import { Wordmark } from './Wordmark';
import { Avatar } from './Avatar';
import { Btn } from './Btn';
import { useAuthStore } from '../stores/authStore';

interface Props {
  active?: string;
  tabs?: string[];
  showRight?: boolean;
  onTabPress?: (tab: string) => void;
}

export function TopBar({
  active = 'Feed',
  tabs = ['Feed', 'Explore', 'Trips', 'Saved'],
  showRight = true,
  onTabPress,
}: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  return (
    <View style={styles.bar}>
      <Wordmark size={24} />
      <View style={styles.tabs}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => onTabPress?.(t)}
            style={[styles.tab, t === active && styles.tabActive]}
          >
            <Text style={[styles.tabText, t === active ? styles.tabTextActive : styles.tabTextInactive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.spacer} />
      {showRight && (
        <>
          <View style={styles.search}>
            <Text style={styles.searchText}>⌕  Search places, trips, people</Text>
          </View>
          <Btn solid sm>+ New trip</Btn>
          {user ? (
            <TouchableOpacity onPress={() => router.push('/profile/me')}>
              <Avatar size={34} ring />
            </TouchableOpacity>
          ) : (
            <Btn sm onPress={() => router.push('/sign-in')}>Sign in</Btn>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    height: TOP_BAR_H,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
    gap: spacing.lg,
    flexShrink: 0,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: spacing.sm,
  },
  tab: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.accSoft,
    borderWidth: 1.5,
    borderColor: colors.acc,
  },
  tabText: {
    fontSize: fontSize.base,
  },
  tabTextActive: {
    color: colors.ink,
    fontWeight: '600',
  },
  tabTextInactive: {
    color: colors.sub,
  },
  spacer: {
    flex: 1,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 220,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  searchText: {
    fontSize: fontSize.md,
    color: colors.sub,
  },
});

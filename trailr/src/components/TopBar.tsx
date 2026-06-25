import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, TOP_BAR_H } from '../theme/tokens';
import { Wordmark } from './Wordmark';
import { Avatar } from './Avatar';
import { Btn } from './Btn';
import { useAuthStore } from '../stores/authStore';
import { useResponsive } from '../hooks/useResponsive';
import { useUnreadCount } from '@trailr/db';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { SearchOverlay } from './SearchOverlay';

function NotificationBell() {
  const router = useRouter();
  const { data: unread = 0 } = useUnreadCount();
  return (
    <TouchableOpacity style={styles.bell} onPress={() => router.push('/notifications')}>
      <Text style={styles.bellIcon}>🔔</Text>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface Props {
  active?: string;
  tabs?: string[];
  showRight?: boolean;
  onTabPress?: (tab: string) => void;
}

export function TopBar({
  active = 'Feed',
  tabs = ['Feed', 'Explore', 'Trips', 'Saved', 'Book'],
  showRight = true,
  onTabPress,
}: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isPhone } = useResponsive();

  const [rawQuery, setRawQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const debouncedQuery = useDebouncedValue(rawQuery, 250);
  const inputRef = useRef<TextInput>(null);

  const overlayVisible = !isPhone && focused && rawQuery.length >= 2;

  const handleSubmit = () => {
    const q = rawQuery.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
    inputRef.current?.blur();
  };

  const handlePhoneSearchPress = () => {
    router.push('/search');
  };

  const handleResultPick = () => {
    setRawQuery('');
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <View style={styles.bar}>
      <Wordmark size={isPhone ? 20 : 24} />
      {!isPhone && (
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
      )}
      <View style={styles.spacer} />
      {showRight && (
        <>
          {isPhone ? (
            <TouchableOpacity style={styles.searchPill} onPress={handlePhoneSearchPress}>
              <Text style={styles.searchText}>⌕  Search</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.searchWrap}>
              <View style={[styles.search, focused && styles.searchFocused]}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  placeholder="Search places, trips, people"
                  placeholderTextColor={colors.sub}
                  value={rawQuery}
                  onChangeText={setRawQuery}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 150)}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </View>
              {overlayVisible && (
                <SearchOverlay
                  query={debouncedQuery}
                  onPick={handleResultPick}
                />
              )}
            </View>
          )}
          {!isPhone && (
            <Btn solid sm onPress={() => router.push('/(tabs)/trips')}>+ New trip</Btn>
          )}
          {user ? (
            <>
              <NotificationBell />
              <TouchableOpacity onPress={() => router.push('/profile/me')}>
                <Avatar size={34} ring />
              </TouchableOpacity>
            </>
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
    zIndex: 100,
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
  searchWrap: {
    position: 'relative',
    zIndex: 200,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 0 : 7,
    minWidth: 220,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    gap: 6,
    height: 36,
  },
  searchFocused: {
    borderColor: colors.acc,
    backgroundColor: colors.paper,
  },
  searchIcon: {
    fontSize: fontSize.md,
    color: colors.sub,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.ink,
    outlineStyle: 'none',
  } as object,
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  searchText: {
    fontSize: fontSize.md,
    color: colors.sub,
  },
  bell: { position: 'relative', paddingHorizontal: 4 },
  bellIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});

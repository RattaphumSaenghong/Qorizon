/**
 * Notifications — the user's activity feed (live batches, follows, likes, comments).
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@trailr/db';
import type { NotificationItem } from '@trailr/db';
import { colors, spacing, fontSize } from '../src/theme/tokens';
import { Wordmark } from '../src/components/Wordmark';
import { Avatar } from '../src/components/Avatar';
import { Btn } from '../src/components/Btn';
import { useAuthStore } from '../src/stores/authStore';

function message(n: NotificationItem): string {
  const who = n.actor ? `@${n.actor.username}` : 'Someone';
  switch (n.type) {
    case 'live_batch':
      return `${who} shared new posts${n.trip ? ` from ${n.trip.title}` : ''}`;
    case 'follow':
      return `${who} started following you`;
    case 'like':
      return `${who} liked your post`;
    case 'comment':
      return `${who} commented on your post`;
    default:
      return `${who} did something`;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: items = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const open = (n: NotificationItem) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.trip) router.push(`/journal/${n.trip.id}`);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Wordmark size={22} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ flex: 1 }} />
        {items.some((n) => !n.read) && (
          <Btn sm onPress={() => markAll.mutate()}>Mark all read</Btn>
        )}
      </View>

      {!user ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Sign in to see your notifications.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.acc} size="large" /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>No notifications yet.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.row, !n.read && styles.rowUnread]}
              onPress={() => open(n)}
              activeOpacity={0.85}
            >
              <Avatar size={40} ring={!n.read} />
              <Text style={styles.rowText}>{message(n)}</Text>
              {!n.read && <View style={styles.dot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: { color: colors.sub, fontSize: fontSize.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  empty: { fontSize: fontSize.md, color: colors.sub },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  rowUnread: { backgroundColor: colors.accSoft, borderColor: colors.acc },
  rowText: { flex: 1, fontSize: fontSize.md, color: colors.ink },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.acc },
});

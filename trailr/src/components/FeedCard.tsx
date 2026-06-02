import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize } from '../theme/tokens';
import { Avatar } from './Avatar';
import { Chip } from './Chip';

interface Props {
  locationName?: string;
  username?: string;
  photoHeight?: number;
  onPress?: () => void;
}

export function FeedCard({
  locationName = 'Wat Arun · Bangkok',
  username = '@somchai.travels',
  photoHeight = 280,
  onPress,
}: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <View style={styles.header}>
        <Avatar size={38} ring />
        <View style={styles.userInfo}>
          <View style={styles.namePlaceholder} />
          <Chip dot accent style={styles.locationChip}>
            {locationName}
          </Chip>
        </View>
        <Text style={styles.more}>⋯</Text>
      </View>
      <View style={[styles.photo, { height: photoHeight }]}>
        <Text style={styles.photoLabel}>[ trip photo ]</Text>
      </View>
      <View style={styles.actions}>
        <Text style={styles.action}>♡</Text>
        <Text style={styles.action}>▢</Text>
        <Text style={styles.action}>↗</Text>
        <View style={styles.spacer} />
        <Text style={styles.action}>⊡</Text>
      </View>
      <View style={styles.caption}>
        <View style={[styles.bar, { width: '95%' }]} />
        <View style={[styles.bar, { width: '60%' }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  userInfo: {
    flex: 1,
    gap: 5,
  },
  namePlaceholder: {
    height: 10,
    width: 110,
    backgroundColor: colors.bar,
    borderRadius: 5,
  },
  locationChip: {
    alignSelf: 'flex-start',
  },
  more: {
    color: colors.sub,
    fontSize: 20,
  },
  photo: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  photoLabel: {
    fontSize: fontSize.sm,
    color: colors.sub,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  action: {
    fontSize: 22,
    color: colors.ink,
  },
  spacer: {
    flex: 1,
  },
  caption: {
    gap: 7,
  },
  bar: {
    height: 9,
    backgroundColor: colors.bar,
    borderRadius: 5,
  },
});

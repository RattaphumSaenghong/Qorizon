import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, radius } from '../theme/tokens';

interface Props {
  children: React.ReactNode;
  accent?: boolean;
  dot?: boolean;
  style?: object;
}

export function Chip({ children, accent = false, dot = true, style }: Props) {
  return (
    <View
      style={[
        styles.base,
        accent ? styles.accent : styles.default,
        style,
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: accent ? colors.white : colors.acc }]} />
      )}
      <Text style={[styles.text, { color: accent ? colors.white : colors.ink }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  default: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
  },
  accent: {
    backgroundColor: colors.acc,
    borderColor: colors.acc,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
});

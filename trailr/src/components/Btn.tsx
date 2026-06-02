import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme/tokens';

interface Props {
  children: React.ReactNode;
  solid?: boolean;
  sm?: boolean;
  full?: boolean;
  onPress?: () => void;
  style?: object;
}

export function Btn({ children, solid = false, sm = false, full = false, onPress, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.base,
        solid ? styles.solid : styles.outline,
        sm ? styles.sm : styles.md,
        full && styles.full,
        style,
      ]}
      activeOpacity={0.75}
    >
      <Text style={[styles.text, solid ? styles.textSolid : styles.textOutline, sm && styles.textSm]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  solid: {
    backgroundColor: colors.acc,
    borderColor: colors.acc,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.ink,
  },
  md: {
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: spacing.sm + 1,
  },
  sm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  full: {
    alignSelf: 'stretch',
  },
  text: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  textSolid: {
    color: colors.white,
  },
  textOutline: {
    color: colors.ink,
  },
  textSm: {
    fontSize: fontSize.sm,
  },
});

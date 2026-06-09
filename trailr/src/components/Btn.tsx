import React from 'react';
import { Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme/tokens';
import { PressableScale } from './PressableScale';

interface Props {
  children: React.ReactNode;
  solid?: boolean;
  sm?: boolean;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: object;
}

export function Btn({
  children,
  solid = false,
  sm = false,
  full = false,
  disabled = false,
  loading = false,
  onPress,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        solid ? styles.solid : styles.outline,
        sm ? styles.sm : styles.md,
        full && styles.full,
        style,
      ]}
    >
      {/* Keep the label mounted under the spinner so the button keeps its width. */}
      <Text
        style={[
          styles.text,
          solid ? styles.textSolid : styles.textOutline,
          sm && styles.textSm,
          loading && styles.textHidden,
        ]}
      >
        {children}
      </Text>
      {loading && (
        <View style={styles.spinner} pointerEvents="none">
          <ActivityIndicator size="small" color={solid ? colors.white : colors.ink} />
        </View>
      )}
    </PressableScale>
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
  textHidden: {
    opacity: 0,
  },
  spinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  size?: number;
  ring?: boolean;
  imageUri?: string;
}

export function Avatar({ size = 36, ring = false }: Props) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring ? colors.acc : colors.line,
          borderWidth: ring ? 2.5 : 1.5,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.panel,
  },
});

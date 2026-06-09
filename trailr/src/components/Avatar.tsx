import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  size?: number;
  ring?: boolean;
  imageUri?: string | null;
}

export function Avatar({ size = 36, ring = false, imageUri }: Props) {
  const frame = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderColor: ring ? colors.acc : colors.line,
    borderWidth: ring ? 2.5 : 1.5,
  };
  return (
    <View style={[styles.base, frame]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.img} resizeMode="cover" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.panel,
    overflow: 'hidden',
  },
  img: { width: '100%', height: '100%' },
});

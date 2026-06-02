import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  size?: number;
}

export function Wordmark({ size = 26 }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.text, { fontSize: size }]}>trailr</Text>
      <View style={[styles.dot, { width: size * 0.16, height: size * 0.16 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  text: {
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.5,
  },
  dot: {
    borderRadius: 999,
    backgroundColor: colors.acc,
    marginBottom: 3,
    marginLeft: 1,
  },
});

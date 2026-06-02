/**
 * Saved screen — placeholder until designs are finalized
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fontSize } from '../../src/theme/tokens';
import { TopBar } from '../../src/components/TopBar';

export default function SavedScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <TopBar
        active="Saved"
        onTabPress={(tab) => {
          if (tab === 'Feed') router.push('/(tabs)/');
          if (tab === 'Explore') router.push('/(tabs)/explore');
          if (tab === 'Trips') router.push('/(tabs)/trips');
        }}
      />
      <View style={styles.center}>
        <Text style={styles.label}>Saved trips — coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: fontSize.lg, color: colors.sub },
});

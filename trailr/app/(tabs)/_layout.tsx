import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { colors } from '../../src/theme/tokens';
import { useResponsive } from '../../src/hooks/useResponsive';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  // Phone: real bottom tab bar. Tablet: hidden — the TopBar drives navigation.
  const { isPhone } = useResponsive();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isPhone
          ? { backgroundColor: colors.paper, borderTopColor: colors.line }
          : { display: 'none' },
        tabBarActiveTintColor: colors.acc,
        tabBarInactiveTintColor: colors.sub,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: icon('🧭') }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: icon('🗺️') }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: icon('🔖') }} />
      <Tabs.Screen name="book" options={{ title: 'Book', tabBarIcon: icon('B') }} />
    </Tabs>
  );
}

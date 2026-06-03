import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../src/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="journal/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="builder/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="album/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="booking/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="profile/[username]" options={{ presentation: 'card' }} />
      </Stack>
    </AppProviders>
  );
}

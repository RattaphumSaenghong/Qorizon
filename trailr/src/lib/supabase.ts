/**
 * React Native Supabase client initialiser.
 *
 * Uses expo-secure-store on device (iOS/Android) and falls back to
 * an in-memory store on web (Next.js handles its own init separately).
 *
 * Call initSupabase() once in AppProviders before any queries run.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createSupabaseClient, StorageAdapter } from '@trailr/db';

/**
 * SecureStore adapter — wraps expo-secure-store to match Supabase's
 * expected AsyncStorage interface.
 *
 * Note: SecureStore values must be strings and ≤2048 bytes.
 * Supabase sessions are well within that limit.
 */
const secureStoreAdapter: StorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

/**
 * In-memory fallback for web (Expo web / browser preview).
 * Next.js will use its own cookie-based init.
 */
const memoryStore: Record<string, string> = {};
const memoryAdapter: StorageAdapter = {
  getItem: (key) => memoryStore[key] ?? null,
  setItem: (key, value) => { memoryStore[key] = value; },
  removeItem: (key) => { delete memoryStore[key]; },
};

// Web: localStorage so the session survives page refresh. Falls back to
// the in-memory store during SSR / when localStorage is unavailable.
const webAdapter: StorageAdapter =
  typeof window !== 'undefined' && window.localStorage
    ? {
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
        removeItem: (key) => window.localStorage.removeItem(key),
      }
    : memoryAdapter;

export function initSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      '[trailr] Supabase env vars missing. ' +
      'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local',
    );
    // Still initialise with placeholders so the app renders (mock data will be used)
    return createSupabaseClient(
      url ?? 'https://placeholder.supabase.co',
      key ?? 'placeholder-key',
      Platform.OS === 'web' ? webAdapter : secureStoreAdapter,
    );
  }

  return createSupabaseClient(
    url,
    key,
    Platform.OS === 'web' ? webAdapter : secureStoreAdapter,
  );
}

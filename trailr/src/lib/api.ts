/**
 * Trailr API client initialiser (replaces the old Supabase init).
 *
 * Persists the JWT pair via expo-secure-store on device and localStorage on web.
 * Call initApi() once in AppProviders before any queries run.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createApiClient, StorageAdapter } from '@trailr/db';

const secureStoreAdapter: StorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const memoryStore: Record<string, string> = {};
const memoryAdapter: StorageAdapter = {
  getItem: (key) => memoryStore[key] ?? null,
  setItem: (key, value) => {
    memoryStore[key] = value;
  },
  removeItem: (key) => {
    delete memoryStore[key];
  },
};

// Web: localStorage so the session survives refresh; in-memory fallback during SSR.
const webAdapter: StorageAdapter =
  typeof window !== 'undefined' && window.localStorage
    ? {
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
        removeItem: (key) => window.localStorage.removeItem(key),
      }
    : memoryAdapter;

export function initApi() {
  const url = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  if (!process.env.EXPO_PUBLIC_API_URL) {
    console.warn('[trailr] EXPO_PUBLIC_API_URL not set — defaulting to ' + url);
  }
  createApiClient(url, Platform.OS === 'web' ? webAdapter : secureStoreAdapter);
}

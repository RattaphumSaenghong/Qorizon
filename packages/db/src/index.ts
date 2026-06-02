// Client
export { createSupabaseClient, getSupabaseClient } from './client';
export type { Database, TypedSupabaseClient, StorageAdapter } from './client';

// Types
export * from './types';

// Query functions (framework-agnostic)
export * from './queries/trips';
export * from './queries/stops';
export * from './queries/users';

// React Query hooks
export * from './hooks/useTrip';
export * from './hooks/useFeed';
export * from './hooks/useUser';

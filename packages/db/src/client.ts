import { createClient as _createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserRow, TripRow, TripDayRow, StopRow, MediaRow, TrailPointRow, LiveBatchRow, FollowRow, LikeRow, CommentRow, SavedItemRow, BookingRow, NotificationRow } from './types/database';

/**
 * Supabase database schema shape.
 * Passed as the generic to createClient so every query is typed end-to-end.
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Partial<UserRow> & Pick<UserRow, 'id' | 'username'>;
        Update: Partial<UserRow>;
      };
      trips: {
        Row: TripRow;
        Insert: Omit<TripRow, 'created_at' | 'updated_at' | 'fork_count'> & { id?: string; fork_count?: number };
        Update: Partial<Omit<TripRow, 'id' | 'created_at'>>;
      };
      trip_days: {
        Row: TripDayRow;
        Insert: Omit<TripDayRow, 'id'> & { id?: string };
        Update: Partial<Omit<TripDayRow, 'id'>>;
      };
      stops: {
        Row: StopRow;
        Insert: Omit<StopRow, 'id' | 'created_at' | 'updated_at' | 'like_count' | 'comment_count'> & { id?: string };
        Update: Partial<Omit<StopRow, 'id' | 'created_at'>>;
      };
      media: {
        Row: MediaRow;
        Insert: Omit<MediaRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<MediaRow, 'id' | 'created_at'>>;
      };
      trail_points: {
        Row: TrailPointRow;
        Insert: Omit<TrailPointRow, 'id' | 'recorded_at'> & { id?: string };
        Update: Partial<Omit<TrailPointRow, 'id'>>;
      };
      live_batches: {
        Row: LiveBatchRow;
        Insert: Omit<LiveBatchRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<LiveBatchRow, 'id' | 'created_at'>>;
      };
      follows: {
        Row: FollowRow;
        Insert: FollowRow;
        Update: Partial<FollowRow>;
      };
      likes: {
        Row: LikeRow;
        Insert: Omit<LikeRow, 'created_at'> & { created_at?: string };
        Update: Partial<LikeRow>;
      };
      comments: {
        Row: CommentRow;
        Insert: Omit<CommentRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<CommentRow, 'id' | 'created_at'>>;
      };
      saved_items: {
        Row: SavedItemRow;
        Insert: Omit<SavedItemRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<SavedItemRow, 'id' | 'created_at'>>;
      };
      bookings: {
        Row: BookingRow;
        Insert: Omit<BookingRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<BookingRow, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<NotificationRow, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      fork_trip: {
        Args: { p_source_trip_id: string; p_new_user_id?: string; p_mode?: 'full' | 'skim' };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}

export type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Storage adapter interface.
 * Platform provides its own implementation:
 *   - React Native: expo-secure-store
 *   - Web / Next.js: cookie-based (supabase SSR helper)
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

let _client: TypedSupabaseClient | null = null;

/**
 * createSupabaseClient — call once per platform at app startup.
 *
 * @param url     - SUPABASE_URL from env
 * @param key     - SUPABASE_ANON_KEY from env
 * @param storage - platform storage adapter (SecureStore on native, cookies on web)
 */
export function createSupabaseClient(
  url: string,
  key: string,
  storage?: StorageAdapter,
): TypedSupabaseClient {
  _client = _createClient<Database>(url, key, {
    auth: {
      storage: storage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // handled per-platform
    },
  });
  return _client;
}

/**
 * getSupabaseClient — call anywhere after createSupabaseClient has run.
 * Throws early if the client hasn't been initialised yet.
 */
export function getSupabaseClient(): TypedSupabaseClient {
  if (!_client) {
    throw new Error(
      '[trailr/db] Supabase client not initialised. ' +
      'Call createSupabaseClient() in your app entry point first.',
    );
  }
  return _client;
}

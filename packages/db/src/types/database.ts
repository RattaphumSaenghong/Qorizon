/**
 * Database types for Trailr — match supabase/migrations/*.sql (the unified
 * `stops` model). When a real project exists, regenerate with:
 *   npx supabase gen types typescript --local > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type TripStatus = 'draft' | 'active' | 'completed';
export type TripVisibility = 'public' | 'followers' | 'link_only' | 'private';
export type LiveCadence = 'hourly' | 'daily' | 'manual';
export type StopStatus = 'planned' | 'visited' | 'skipped';
export type StopCategory = 'place' | 'landmark' | 'food' | 'activity' | 'hotel' | 'flight' | 'transport' | 'note';
/** Categories a skim-fork excludes (logistics you'll re-plan yourself). */
export const SKIM_EXCLUDED_CATEGORIES: StopCategory[] = ['hotel', 'flight', 'transport'];
export type ForkMode = 'full' | 'skim';
export type MediaType = 'photo' | 'video' | 'audio';
export type BookingType = 'flight' | 'hotel';
export type BookingProvider = 'amadeus' | 'agoda' | 'booking_com';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type NotificationType = 'live_batch' | 'follow' | 'like' | 'comment';
export type UserLanguage = 'th' | 'en';

// ── Row types ────────────────────────────────────────────────

export interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  language: UserLanguage;
  follower_count: number;
  following_count: number;
  created_at: string;
}

export interface AlbumOverrides {
  order?: string[];                       // ordered media ids
  captions?: Record<string, string>;      // media_id → caption
  excluded?: string[];                    // excluded media ids
}

export interface TripRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: TripStatus;
  live_mode: boolean;
  live_cadence: LiveCadence;
  visibility: TripVisibility;
  forked_from_id: string | null;
  fork_count: number;
  start_date: string | null;
  end_date: string | null;
  album_overrides: AlbumOverrides | null;
  created_at: string;
  updated_at: string;
}

export interface TripDayRow {
  id: string;
  trip_id: string;
  day_number: number;
  place: string | null;
  date: string | null;
}

/** The unified plan↔story unit (replaces posts + itinerary_items). */
export interface StopRow {
  id: string;
  trip_id: string;
  day_id: string | null;
  user_id: string;
  status: StopStatus;
  category: StopCategory;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  // plan face
  planned_time: string | null;
  duration_mins: number | null;
  sort_order: number;
  notes: string | null;
  // story face
  caption: string | null;
  captured_at: string | null;
  batch_date: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface MediaRow {
  id: string;
  stop_id: string;
  user_id: string;
  type: MediaType;
  url: string;
  cdn_url: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  duration_secs: number | null;
  size_bytes: number | null;
  sort_order: number;
  created_at: string;
}

export interface TrailPointRow {
  id: string;
  trip_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  recorded_at: string;
}

export interface LiveBatchRow {
  id: string;
  trip_id: string;
  batch_date: string;
  title: string | null;
  stop_ids: string[];
  published_at: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface FollowRow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface LikeRow {
  user_id: string;
  stop_id: string;
  created_at: string;
}

export interface CommentRow {
  id: string;
  user_id: string;
  stop_id: string;
  content: string;
  created_at: string;
}

export interface SavedItemRow {
  id: string;
  user_id: string;
  stop_id: string | null;
  trip_id: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  user_id: string;
  trip_id: string | null;
  type: BookingType;
  provider: BookingProvider;
  external_ref: string | null;
  status: BookingStatus;
  amount_thb: number | null;
  commission_thb: number | null;
  raw_payload: Json | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  trip_id: string | null;
  stop_id: string | null;
  batch_id: string | null;
  read: boolean;
  push_sent: boolean;
  created_at: string;
}

// ── Insert helpers ───────────────────────────────────────────

export type InsertTrip = Omit<TripRow, 'id' | 'created_at' | 'updated_at' | 'fork_count'> & { id?: string };
export type InsertTripDay = Omit<TripDayRow, 'id'> & { id?: string };
export type InsertStop =
  Omit<StopRow, 'id' | 'created_at' | 'updated_at' | 'like_count' | 'comment_count' | 'category' | 'status' | 'sort_order'>
  & { id?: string; category?: StopCategory; status?: StopStatus; sort_order?: number };
export type InsertMedia = Omit<MediaRow, 'id' | 'created_at'> & { id?: string };
export type InsertComment = Omit<CommentRow, 'id' | 'created_at'> & { id?: string };
export type InsertBooking = Omit<BookingRow, 'id' | 'created_at'> & { id?: string };

// ── Composite / joined types (used in UI) ────────────────────

type AuthorLite = Pick<UserRow, 'id' | 'username' | 'display_name' | 'avatar_url'>;

export interface StopWithMedia extends StopRow {
  media: MediaRow[];
  author: AuthorLite;
}

export interface TripWithAuthor extends TripRow {
  author: AuthorLite;
  days?: TripDayRow[];
  stops?: StopWithMedia[];
}

/** A visited stop surfaced in the feed. */
export interface FeedStop extends StopWithMedia {
  trip: Pick<TripRow, 'id' | 'title' | 'cover_image_url'>;
  is_liked: boolean;
  is_saved: boolean;
}

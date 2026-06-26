/**
 * Database/API types for Trailr — the shapes the NestJS REST API returns
 * (the unified `stops` model). Hand-maintained to mirror api/prisma/schema.prisma.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type TripStatus = 'draft' | 'active' | 'completed' | 'archived';
export type TripVisibility = 'public' | 'followers' | 'link_only' | 'private';
export type LiveCadence = 'hourly' | 'daily' | 'manual';
export type TransportMode = 'train' | 'transit' | 'car' | 'walk' | 'mixed';
export type StopStatus = 'planned' | 'visited' | 'skipped';
export type StopScope = 'shared' | 'assigned';
export type StopCategory = 'place' | 'landmark' | 'food' | 'activity' | 'hotel' | 'flight' | 'transport' | 'note';
/** Categories a skim-fork excludes (logistics you'll re-plan yourself). */
export const SKIM_EXCLUDED_CATEGORIES: StopCategory[] = ['hotel', 'flight', 'transport'];
export type ForkMode = 'full' | 'skim';
export type MediaType = 'photo' | 'video' | 'audio';
export type MediaVisibility = 'shared' | 'private';
export type BookingType = 'flight' | 'hotel';
export type BookingProvider = 'duffel' | 'liteapi' | 'email' | 'mock';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type NotificationType = 'live_batch' | 'follow' | 'like' | 'comment' | 'trip_invite' | 'trip_message' | 'member_accepted' | 'member_declined' | 'inventory_item';
export type InventoryStatus = 'unmatched' | 'matched' | 'dismissed';
export type UserLanguage = 'th' | 'en';

export interface FlightSummary {
  origin: string;
  destination: string;
  dep_at: string | null;
  arr_at: string | null;
  carrier: string | null;
  carrier_name: string | null;
  flight_number: string | null;
  stops: number;
  // Provider's true elapsed time (e.g. ISO "PT6H7M"). Authoritative — dep_at/arr_at
  // are tz-naive local times, so wall-clock subtraction between them is wrong across timezones.
  duration?: string | null;
}

export interface FlightSegment {
  origin: string | null;
  destination: string | null;
  departing_at: string | null;
  arriving_at: string | null;
  carrier: string | null;
  carrier_name: string | null;
  flight_number: string | null;
}

// ── Row types ────────────────────────────────────────────────

export interface UserRow {
  id: string;
  username: string;
  forwarding_token?: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  real_name: string | null;
  phone: string | null; // only present for yourself or trip co-members
  language: UserLanguage;
  follower_count: number;
  following_count: number;
  created_at: string;
}

// ── Trip members / invites ───────────────────────────────────
export type MemberStatus = 'pending' | 'accepted' | 'declined';

export interface TripMemberItem {
  id: string;
  trip_id: string;
  user_id: string;
  role: string;
  status: MemberStatus;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    real_name: string | null;
  };
}

export interface TripInviteItem {
  id: string;
  trip_id: string;
  status: MemberStatus;
  trip: { id: string; title: string; destination: string | null; cover_image_url: string | null };
  inviter: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
}

export interface AlbumOverrides {
  order?: string[];                       // ordered media ids
  captions?: Record<string, string>;      // media_id → caption
  excluded?: string[];                    // excluded media ids
  included?: string[];                    // shared pool media from others pulled in
}

export interface TripRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: TripStatus;
  stage: 'planning' | 'living' | 'album';
  transport_mode: TransportMode;
  destination: string | null;
  budget: number | null;
  budget_currency: string;
  live_mode: boolean;
  live_cadence: LiveCadence;
  visibility: TripVisibility;
  forked_from_id: string | null;
  fork_count: number;
  start_date: string | null;
  end_date: string | null;
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
  scope: StopScope;
  assignees: AuthorLite[];
  category: StopCategory;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  // plan face
  planned_start: string | null;
  planned_end: string | null;
  duration_mins: number | null;
  cost: number | null;
  paid_by: string | null;
  sort_order: number;
  notes: string | null;
  meta: Record<string, unknown> | null;
  // story face
  caption: string | null;
  captured_at: string | null;
  batch_date: string | null;
  feed_eligible: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface MediaRow {
  id: string;
  trip_id: string;
  stop_id: string | null;
  user_id: string;
  type: MediaType;
  visibility: MediaVisibility;
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

/** A photo in the trip-level shared pool (includes location_name from the owning stop if any). */
export interface PoolItem extends MediaRow {
  location_name: string | null;
}

export interface UploadTripMediaRequest {
  type: MediaType;
  content_base64: string;
  content_type: string;
  visibility?: MediaVisibility;
  stop_id?: string;
  latitude?: number;
  longitude?: number;
  captured_at?: string;
}

export interface UpdateMediaRequest {
  visibility?: MediaVisibility;
  stop_id?: string | null;
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
  title: string | null; // surfaced from raw_payload for display
  created_at: string;
}

export interface BookingDetailRow extends BookingRow {
  stop_id: string | null;
  meta: Record<string, unknown> | null;
  confirmation: Record<string, unknown> | null;
}

export interface InventoryItemRow {
  id: string;
  user_id: string;
  source: string;
  type: BookingType;
  parsed: Record<string, unknown>;
  status: InventoryStatus;
  matched_stop_id: string | null;
  received_at: string;
}

/** A bookable offer from a provider search (not persisted until booked). */
export interface BookingOffer {
  id: string;
  type: BookingType;
  provider: BookingProvider;
  title: string;
  subtitle: string;
  amount_thb: number;
  latitude?: number;
  longitude?: number;
  meta?: Record<string, unknown>;
}

export interface HotelPin {
  hotel_id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  stars: number | null;
  thumbnail?: string;
  address?: string;
}

export interface HotelCatalogQuery {
  latitude: number;
  longitude: number;
  radiusM: number;
  limit?: number;
}

export interface HotelRatesQuery {
  hotelIds: string[];
  check_in: string;
  check_out: string;
  adults?: number;
}

export interface SearchBookingRequest {
  type: BookingType;
  trip_id?: string;
  origin?: string;
  destination?: string;
  depart_date?: string;
  return_date?: string;
  city?: string;
  check_in?: string;
  nights?: number;
}

export interface CreateBookingRequest {
  type: BookingType;
  provider: BookingProvider;
  trip_id?: string;
  external_ref?: string;
  amount_thb: number;
  title?: string;
  assignee_ids?: string[];
  meta?: Record<string, unknown>;
  passenger_details?: PassengerDetails;
  guest_details?: GuestDetails;
}

export interface PassengerDetails {
  title?: string;
  given_name: string;
  family_name: string;
  born_on?: string;
  gender?: string;
  email?: string;
  phone_number?: string;
}

export interface GuestDetails {
  given_name: string;
  family_name: string;
  email?: string;
  phone_number?: string;
}

// ── Hotel recommendations (mirror of @trailr/shared recommendations) ──

/** A hotel scored against a trip's itinerary, transit and budget. */
export interface HotelRecommendation {
  offer_id: string; // provider offer id → feeds the existing CreateBookingRequest flow
  provider: BookingProvider;
  name: string;
  latitude: number;
  longitude: number;
  nightly_thb: number;
  total_thb: number;
  rating: number | null;
  score: number; // 0–1 weighted blend
  avg_km_to_stops: number;
  station_name?: string;
  station_meters?: number;
  why: string;
}

export interface HotelRecommendationsResponse {
  /** True when attractions are too geographically spread for one hotel; items is empty. */
  multi_area: boolean;
  anchor: { latitude: number; longitude: number } | null;
  nights: number;
  nightly_cap_thb: number | null;
  items: HotelRecommendation[];
}

export interface HotelRecsParams {
  check_in?: string;
  check_out?: string;
  guests?: number;
  nightly_cap?: number;
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

export type InsertTrip = Omit<TripRow, 'id' | 'created_at' | 'updated_at' | 'fork_count' | 'transport_mode'> & {
  id?: string;
  backdated?: boolean;
  transport_mode?: TransportMode;
};
export type InsertTripDay = Omit<TripDayRow, 'id'> & { id?: string };
export type InsertStop =
  Omit<StopRow, 'id' | 'created_at' | 'updated_at' | 'like_count' | 'comment_count' | 'feed_eligible' | 'category' | 'status' | 'sort_order' | 'scope' | 'assignees' | 'paid_by' | 'meta'>
  & { id?: string; category?: StopCategory; status?: StopStatus; sort_order?: number; scope?: StopScope; assignee_ids?: string[]; paid_by?: string; meta?: Record<string, unknown> | null };
export type InsertMedia = Omit<MediaRow, 'id' | 'created_at'> & { id?: string };
export type InsertComment = Omit<CommentRow, 'id' | 'created_at'> & { id?: string };
export type InsertBooking = Omit<BookingRow, 'id' | 'created_at'> & { id?: string };

// ── Composite / joined types (used in UI) ────────────────────

export type AuthorLite = Pick<UserRow, 'id' | 'username' | 'display_name' | 'avatar_url'>;

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

/** A bookmarked stop or trip (exactly one is set). */
export interface SavedItem {
  id: string;
  created_at: string;
  stop: StopWithMedia | null;
  trip: TripWithAuthor | null;
}

export interface CommentItem {
  id: string;
  stop_id: string;
  content: string;
  created_at: string;
  author: AuthorLite;
}

export interface TripMessageItem {
  id: string;
  trip_id: string;
  body: string;
  created_at: string;
  author: AuthorLite;
}

// ── Album (derived view of a trip's visited media) ───────────

export interface AlbumItem {
  media_id: string;
  stop_id: string | null;
  type: MediaType;
  url: string;
  cdn_url: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  location_name: string | null;
  caption: string | null;
  excluded: boolean;
}

export interface Album {
  trip: Pick<TripRow, 'id' | 'title' | 'cover_image_url' | 'user_id'>;
  author: AuthorLite;
  items: AlbumItem[];
  count: number;
}

/** Edits layered over the album (also the PATCH body). */
export type UpdateAlbum = AlbumOverrides;

// ── Live trail ───────────────────────────────────────────────

export interface TrailPointInput {
  latitude: number;
  longitude: number;
  altitude?: number;
  recorded_at?: string;
}

// ── Notifications (enriched read shape) ──────────────────────

export interface NotificationItem {
  id: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  actor: AuthorLite | null;
  trip: { id: string; title: string; stage: string | null } | null;
  stop_id: string | null;
  batch_id: string | null;
}

// ── Search ───────────────────────────────────────────────────

export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  follower_count: number;
}

export interface TripSearchResult {
  id: string;
  title: string;
  destination: string | null;
  cover_image_url: string | null;
  stage: 'planning' | 'living' | 'album';
  author: AuthorLite;
}

export interface SearchResults {
  users: UserSearchResult[];
  trips: TripSearchResult[];
}

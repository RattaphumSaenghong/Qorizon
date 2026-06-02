import { getSupabaseClient } from '../client';
import type { TripWithAuthor, InsertTrip, TripRow, ForkMode } from '../types';

// NOTE: Supabase query builder types require generated types from `supabase gen types`.
// Until a real project exists, we use `any` casts at the DB boundary only.
// All return types and hook types remain fully typed via our own interfaces.
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Fetch a single trip by ID, joined with its author. */
export async function fetchTrip(tripId: string): Promise<TripWithAuthor> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('trips')
    .select(`
      *,
      author:users!trips_user_id_fkey (
        id, username, display_name, avatar_url
      )
    `)
    .eq('id', tripId)
    .single();

  if (error) throw error;
  return data as TripWithAuthor;
}

/** Fetch all public trips for a user's profile. */
export async function fetchUserTrips(userId: string): Promise<TripWithAuthor[]> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('trips')
    .select(`
      *,
      author:users!trips_user_id_fkey (
        id, username, display_name, avatar_url
      )
    `)
    .eq('user_id', userId)
    .in('visibility', ['public', 'followers'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TripWithAuthor[];
}

/** Fetch trips from users that the current user follows (home feed). */
export async function fetchFollowingFeed(userId: string, limit = 20): Promise<TripWithAuthor[]> {
  const db = getSupabaseClient() as any;

  // Step 1: get IDs of people we follow
  const { data: follows, error: followError } = await db
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (followError) throw followError;

  const followingIds = (follows ?? []).map((f: any) => f.following_id as string);
  if (followingIds.length === 0) return [];

  // Step 2: fetch their trips
  const { data, error } = await db
    .from('trips')
    .select(`
      *,
      author:users!trips_user_id_fkey (
        id, username, display_name, avatar_url
      )
    `)
    .in('user_id', followingIds)
    .in('visibility', ['public', 'followers'])
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as TripWithAuthor[];
}

/** Create a new trip. */
export async function createTrip(trip: InsertTrip): Promise<TripRow> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('trips')
    .insert(trip)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fork a trip via the `fork_trip` SQL function.
 * Server-side: copies the plan (trip + days + stops reset to 'planned'),
 * strips story data, bumps source fork_count — atomically.
 *
 * mode 'full' → copies every stop.
 * mode 'skim' → drops logistics (hotel/flight/transport) + empty days;
 *               keeps the spots, food & activities.
 *
 * Owner is forced to the authenticated user server-side; newUserId is a
 * fallback for service-role/seed contexts only.
 */
export async function forkTrip(
  sourceTripId: string,
  mode: ForkMode = 'full',
  newUserId?: string,
): Promise<TripRow> {
  const db = getSupabaseClient() as any;

  const { data: newTripId, error } = await db.rpc('fork_trip', {
    p_source_trip_id: sourceTripId,
    p_new_user_id: newUserId ?? null,
    p_mode: mode,
  });
  if (error) throw error;

  const { data: forked, error: fetchError } = await db
    .from('trips')
    .select('*')
    .eq('id', newTripId)
    .single();
  if (fetchError) throw fetchError;

  return forked as TripRow;
}

/** Fetch a trip's days, ordered. */
export async function fetchTripDays(tripId: string) {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('trip_days')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Update trip metadata (title, visibility, status, etc.) */
export async function updateTrip(
  tripId: string,
  updates: Partial<Omit<TripRow, 'id' | 'user_id' | 'created_at'>>,
): Promise<TripRow> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('trips')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tripId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

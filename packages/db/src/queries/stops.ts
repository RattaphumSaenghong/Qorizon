import { getSupabaseClient } from '../client';
import type { FeedStop, InsertStop, StopRow, StopWithMedia, StopStatus } from '../types';
/* eslint-disable @typescript-eslint/no-explicit-any */
// Supabase query-builder types require generated types; we cast at the DB
// boundary only. Return types stay fully typed via our own interfaces.

/** Fetch a trip's stops with media. Optionally filter by lifecycle status. */
export async function fetchTripStops(
  tripId: string,
  status?: StopStatus,
): Promise<StopWithMedia[]> {
  const db = getSupabaseClient() as any;
  let q = db
    .from('stops')
    .select(`
      *,
      media (*),
      author:users!stops_user_id_fkey ( id, username, display_name, avatar_url )
    `)
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as StopWithMedia[];
}

/**
 * Home feed: recent VISITED stops from people the user follows,
 * enriched with trip info + whether the viewer liked each one.
 */
export async function fetchFeedStops(userId: string, limit = 30): Promise<FeedStop[]> {
  const db = getSupabaseClient() as any;

  const { data: follows } = await db
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = (follows ?? []).map((f: any) => f.following_id as string);
  if (followingIds.length === 0) return [];

  const { data, error } = await db
    .from('stops')
    .select(`
      *,
      media (*),
      author:users!stops_user_id_fkey ( id, username, display_name, avatar_url ),
      trip:trips!stops_trip_id_fkey ( id, title, cover_image_url )
    `)
    .eq('status', 'visited')
    .in('user_id', followingIds)
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const stopIds = (data ?? []).map((s: any) => s.id as string);

  const { data: likes } = await db
    .from('likes')
    .select('stop_id')
    .eq('user_id', userId)
    .in('stop_id', stopIds);
  const likedSet = new Set((likes ?? []).map((l: any) => l.stop_id as string));

  const { data: saved } = await db
    .from('saved_items')
    .select('stop_id')
    .eq('user_id', userId)
    .in('stop_id', stopIds);
  const savedSet = new Set((saved ?? []).map((s: any) => s.stop_id as string));

  return (data ?? []).map((s: any) => ({
    ...s,
    is_liked: likedSet.has(s.id),
    is_saved: savedSet.has(s.id),
  })) as FeedStop[];
}

/** Create a stop (planned or visited). */
export async function createStop(stop: InsertStop): Promise<StopRow> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db.from('stops').insert(stop).select().single();
  if (error) throw error;
  return data as StopRow;
}

/** Mark a planned stop as visited (the plan→story transition). */
export async function markStopVisited(
  stopId: string,
  fields?: { caption?: string; captured_at?: string },
): Promise<StopRow> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('stops')
    .update({ status: 'visited', ...fields })
    .eq('id', stopId)
    .select()
    .single();
  if (error) throw error;
  return data as StopRow;
}

/** Remove a stop. */
export async function deleteStop(stopId: string): Promise<void> {
  const db = getSupabaseClient() as any;
  const { error } = await db.from('stops').delete().eq('id', stopId);
  if (error) throw error;
}

/** Toggle like on a stop. Returns new like state. */
export async function toggleLike(userId: string, stopId: string): Promise<boolean> {
  const db = getSupabaseClient() as any;

  const { data: existing } = await db
    .from('likes')
    .select('user_id')
    .eq('user_id', userId)
    .eq('stop_id', stopId)
    .maybeSingle();

  if (existing) {
    await db.from('likes').delete().eq('user_id', userId).eq('stop_id', stopId);
    return false;
  }
  await db.from('likes').insert({ user_id: userId, stop_id: stopId });
  return true;
}

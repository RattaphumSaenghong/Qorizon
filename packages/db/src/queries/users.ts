import { getSupabaseClient } from '../client';
import type { UserRow } from '../types';

/** Fetch a user profile by ID. */
export async function fetchUser(userId: string): Promise<UserRow> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/** Fetch a user profile by username (for profile pages). */
export async function fetchUserByUsername(username: string): Promise<UserRow> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) throw error;
  return data;
}

/** Check if currentUser follows targetUser. */
export async function checkIsFollowing(
  currentUserId: string,
  targetUserId: string,
): Promise<boolean> {
  const db = getSupabaseClient() as any;
  const { data } = await db
    .from('follows')
    .select('follower_id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  return !!data;
}

/** Follow a user. */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  const db = getSupabaseClient() as any;
  const { error } = await db
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) throw error;
}

/** Unfollow a user. */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const db = getSupabaseClient() as any;
  const { error } = await db
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}

/** Update a user's profile. */
export async function updateUser(
  userId: string,
  updates: Partial<Pick<UserRow, 'display_name' | 'bio' | 'avatar_url' | 'language'>>,
): Promise<UserRow> {
  const db = getSupabaseClient() as any;
  const { data, error } = await db
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

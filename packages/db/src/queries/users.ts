import { request } from '../http';
import type { StopWithMedia, UserRow } from '../types';

/** Fetch a user profile by ID. */
export async function fetchUser(userId: string): Promise<UserRow> {
  return request<UserRow>('GET', `/users/${userId}`);
}

/** A user's posts (visited stops) for their profile grid. */
export async function fetchUserPosts(userId: string): Promise<StopWithMedia[]> {
  return request<StopWithMedia[]>('GET', `/users/${userId}/posts`);
}

/** Users that `userId` follows (trip-invite picker). */
export async function fetchFollowing(userId: string): Promise<UserRow[]> {
  return request<UserRow[]>('GET', `/users/${userId}/following`);
}

/** Fetch a user profile by username (for profile pages). */
export async function fetchUserByUsername(username: string): Promise<UserRow> {
  return request<UserRow>('GET', `/users/by-username/${username}`);
}

/** Check if the current user follows targetUser. */
export async function checkIsFollowing(
  _currentUserId: string,
  targetUserId: string,
): Promise<boolean> {
  const res = await request<{ is_following: boolean }>('GET', `/users/${targetUserId}/is-following`);
  return res.is_following;
}

/** Follow a user (follower = authenticated user). */
export async function followUser(_followerId: string, followingId: string): Promise<void> {
  await request<void>('POST', `/users/${followingId}/follow`);
}

/** Unfollow a user. */
export async function unfollowUser(_followerId: string, followingId: string): Promise<void> {
  await request<void>('DELETE', `/users/${followingId}/follow`);
}

/** Update a user's profile. */
export async function updateUser(
  userId: string,
  updates: Partial<Pick<UserRow, 'display_name' | 'bio' | 'avatar_url' | 'language'>>,
): Promise<UserRow> {
  return request<UserRow>('PATCH', `/users/${userId}`, updates);
}

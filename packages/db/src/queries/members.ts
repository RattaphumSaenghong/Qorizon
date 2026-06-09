import { request } from '../http';
import type { TripMemberItem, TripInviteItem, MemberStatus } from '../types';

/** Everyone on a trip (owner + invited). */
export async function fetchMembers(tripId: string): Promise<TripMemberItem[]> {
  return request<TripMemberItem[]>('GET', `/trips/${tripId}/members`);
}

/** Owner invites a user to the trip. */
export async function inviteMember(tripId: string, userId: string): Promise<TripMemberItem> {
  return request<TripMemberItem>('POST', `/trips/${tripId}/members`, { user_id: userId });
}

/** The invited user accepts or declines. */
export async function respondInvite(
  tripId: string,
  status: 'accepted' | 'declined',
): Promise<TripMemberItem> {
  return request<TripMemberItem>('POST', `/trips/${tripId}/members/respond`, { status });
}

/** Owner removes a member, or a member leaves. */
export async function removeMember(tripId: string, userId: string): Promise<void> {
  await request<void>('DELETE', `/trips/${tripId}/members/${userId}`);
}

/** The current user's pending trip invites. */
export async function fetchMyTripInvites(): Promise<TripInviteItem[]> {
  return request<TripInviteItem[]>('GET', '/me/trip-invites');
}

export type { TripMemberItem, TripInviteItem, MemberStatus };

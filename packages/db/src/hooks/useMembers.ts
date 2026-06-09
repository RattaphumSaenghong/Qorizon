import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMembers,
  inviteMember,
  respondInvite,
  removeMember,
  fetchMyTripInvites,
} from '../queries/members';
import { fetchFollowing } from '../queries/users';

export const memberKeys = {
  members: (tripId: string) => ['members', tripId] as const,
  myInvites: () => ['trip-invites', 'me'] as const,
  following: (userId: string) => ['following', userId] as const,
};

/** Everyone on a trip. */
export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: memberKeys.members(tripId),
    queryFn: () => fetchMembers(tripId),
    enabled: !!tripId,
    staleTime: 1000 * 30,
  });
}

/** Users the given user follows (invite picker). */
export function useFollowing(userId: string) {
  return useQuery({
    queryKey: memberKeys.following(userId),
    queryFn: () => fetchFollowing(userId),
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
}

/** The current user's pending trip invites. */
export function useMyTripInvites() {
  return useQuery({
    queryKey: memberKeys.myInvites(),
    queryFn: fetchMyTripInvites,
    staleTime: 1000 * 30,
  });
}

export function useInviteMember(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => inviteMember(tripId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.members(tripId) }),
  });
}

export function useRespondInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, status }: { tripId: string; status: 'accepted' | 'declined' }) =>
      respondInvite(tripId, status),
    onSuccess: (_data, { tripId }) => {
      qc.invalidateQueries({ queryKey: memberKeys.myInvites() });
      qc.invalidateQueries({ queryKey: memberKeys.members(tripId) });
    },
  });
}

export function useRemoveMember(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(tripId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.members(tripId) }),
  });
}

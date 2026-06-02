import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrip, fetchUserTrips, fetchFollowingFeed, forkTrip, updateTrip } from '../queries/trips';
import type { ForkMode } from '../types';

// ── Query keys ── (centralised so invalidations are consistent)
export const tripKeys = {
  all: ['trips'] as const,
  detail: (id: string) => ['trips', id] as const,
  userTrips: (userId: string) => ['trips', 'user', userId] as const,
  feed: (userId: string) => ['trips', 'feed', userId] as const,
};

/** Fetch and cache a single trip. */
export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => fetchTrip(tripId),
    enabled: !!tripId,
    staleTime: 1000 * 60 * 2, // 2 min
  });
}

/** Fetch all trips for a user's profile. */
export function useUserTrips(userId: string) {
  return useQuery({
    queryKey: tripKeys.userTrips(userId),
    queryFn: () => fetchUserTrips(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

/** Fetch the following feed for the home screen. */
export function useFeed(userId: string) {
  return useQuery({
    queryKey: tripKeys.feed(userId),
    queryFn: () => fetchFollowingFeed(userId),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 sec — feed refreshes often
  });
}

/** Fork a trip ('full' or 'skim'). */
export function useForkTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceTripId, mode = 'full', userId }: { sourceTripId: string; mode?: ForkMode; userId?: string }) =>
      forkTrip(sourceTripId, mode, userId),
    onSuccess: (newTrip, { sourceTripId }) => {
      // Invalidate the source trip so fork_count updates
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(sourceTripId) });
      // Invalidate the user's own trips list
      queryClient.invalidateQueries({ queryKey: tripKeys.userTrips(newTrip.user_id) });
    },
  });
}

/** Update trip metadata. */
export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof updateTrip>[1]) => updateTrip(tripId, updates),
    onSuccess: (updated) => {
      // Update the cache directly — no re-fetch needed
      queryClient.setQueryData(tripKeys.detail(tripId), updated);
    },
  });
}

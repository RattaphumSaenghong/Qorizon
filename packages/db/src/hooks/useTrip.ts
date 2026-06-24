import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrip, fetchUserTrips, fetchFollowingFeed, createTrip, forkTrip, updateTrip, deleteTrip, addTripDay, updateTripDay, deleteTripDay } from '../queries/trips';
import type { ForkMode, InsertTrip } from '../types';

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

/** Fetch all trips for a user's profile. Pass includeArchived (owner-only) to show archived trips. */
export function useUserTrips(userId: string, includeArchived = false) {
  return useQuery({
    queryKey: [...tripKeys.userTrips(userId), includeArchived],
    queryFn: () => fetchUserTrips(userId, includeArchived),
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

/** Create a trip. Invalidates the owner's profile trips list so it shows up immediately. */
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trip: InsertTrip) => createTrip(trip),
    onSuccess: (newTrip) => {
      queryClient.invalidateQueries({ queryKey: tripKeys.userTrips(newTrip.user_id) });
    },
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

/** Add a new day to a trip (owner only). Invalidates the days query. */
export function useAddTripDay(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => addTripDay(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'days'] });
    },
  });
}

/** Edit a day's label/date (owner only). Invalidates the days query. */
export function useUpdateTripDay(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, patch }: { dayId: string; patch: { place?: string | null; date?: string | null } }) =>
      updateTripDay(tripId, dayId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'days'] });
    },
  });
}

/** Delete a day and move its stops back to Unsorted. */
export function useDeleteTripDay(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dayId: string) => deleteTripDay(tripId, dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId, 'days'] });
      queryClient.invalidateQueries({ queryKey: ['stops', 'trip', tripId] });
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
      // Visibility/status (e.g. archive) changes must re-flow into the profile grid.
      queryClient.invalidateQueries({ queryKey: tripKeys.userTrips(updated.user_id) });
    },
  });
}

/** Permanently delete a trip. Invalidates the owner's profile trips list. */
export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId }: { tripId: string; userId: string }) => deleteTrip(tripId),
    onSuccess: (_void, { tripId, userId }) => {
      queryClient.removeQueries({ queryKey: tripKeys.detail(tripId) });
      queryClient.invalidateQueries({ queryKey: tripKeys.userTrips(userId) });
    },
  });
}

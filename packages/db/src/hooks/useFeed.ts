import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFeedStops, fetchLikedStops, fetchTripStops, toggleLike } from '../queries/stops';
import type { StopStatus } from '../types';

export const stopKeys = {
  feed: (userId: string) => ['stops', 'feed', userId] as const,
  liked: ['stops', 'liked'] as const,
  tripStops: (tripId: string, status?: StopStatus) =>
    ['stops', 'trip', tripId, status ?? 'all'] as const,
};

/** Home feed: visited stops from followed users. */
export function useFeedStops(userId: string) {
  return useQuery({
    queryKey: stopKeys.feed(userId),
    queryFn: () => fetchFeedStops(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

/** A trip's stops. status='visited' for the journal, omit for the builder. */
export function useTripStops(tripId: string, status?: StopStatus) {
  return useQuery({
    queryKey: stopKeys.tripStops(tripId, status),
    queryFn: () => fetchTripStops(tripId, status),
    enabled: !!tripId,
    staleTime: 1000 * 60,
  });
}

/** Stops the current user has liked. */
export function useLikedStops() {
  return useQuery({
    queryKey: stopKeys.liked,
    queryFn: fetchLikedStops,
    staleTime: 1000 * 30,
  });
}

/** Toggle like with optimistic flip. */
export function useToggleLike(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stopId: string) => toggleLike(userId, stopId),
    onMutate: async (stopId) => {
      await queryClient.cancelQueries({ queryKey: stopKeys.feed(userId) });
      const previous = queryClient.getQueryData(stopKeys.feed(userId));

      queryClient.setQueryData(stopKeys.feed(userId), (old: any) =>
        (old ?? []).map((s: any) =>
          s.id === stopId
            ? {
                ...s,
                is_liked: !s.is_liked,
                like_count: s.is_liked ? s.like_count - 1 : s.like_count + 1,
              }
            : s,
        ),
      );
      return { previous };
    },
    onError: (_err, _stopId, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(stopKeys.feed(userId), ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: stopKeys.feed(userId) });
      queryClient.invalidateQueries({ queryKey: stopKeys.liked });
    },
  });
}

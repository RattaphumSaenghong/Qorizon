import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrail, fetchBatches, publishBatch } from '../queries/live';

export const liveKeys = {
  trail: (tripId: string, member?: string | null) => ['live', 'trail', tripId, member ?? 'all'] as const,
  batches: (tripId: string) => ['live', 'batches', tripId] as const,
};

/** A trip's GPS trail (for the map line). Pass `member` for one person's trail. */
export function useTrail(tripId: string, member?: string | null) {
  return useQuery({
    queryKey: liveKeys.trail(tripId, member),
    queryFn: () => fetchTrail(tripId, member),
    enabled: !!tripId,
    staleTime: 1000 * 30,
  });
}

/** A trip's live batches. */
export function useBatches(tripId: string) {
  return useQuery({
    queryKey: liveKeys.batches(tripId),
    queryFn: () => fetchBatches(tripId),
    enabled: !!tripId,
    staleTime: 1000 * 30,
  });
}

/** Publish a live batch, then refresh the batch list. */
export function usePublishBatch(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts: { batch_date?: string; title?: string; stop_ids?: string[] }) =>
      publishBatch(tripId, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liveKeys.batches(tripId) });
    },
  });
}

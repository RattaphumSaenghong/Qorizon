import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAlbum, fetchContributors, updateAlbum } from '../queries/albums';
import type { UpdateAlbum } from '../types';

export const albumKeys = {
  all: (tripId: string) => ['album', tripId] as const,
  detail: (tripId: string, member?: string | null, includeExcluded = false) =>
    ['album', tripId, member ?? 'owner', includeExcluded] as const,
  contributors: (tripId: string) => ['album', tripId, 'contributors'] as const,
};

interface UseAlbumOpts {
  member?: string | null;     // whose album (defaults to the trip owner's)
  includeExcluded?: boolean;  // hidden media too (your own edit mode)
}

/** A member's personal album. `includeExcluded` (your own edit mode) also returns hidden media. */
export function useAlbum(tripId: string, opts: UseAlbumOpts = {}) {
  const { member = null, includeExcluded = false } = opts;
  return useQuery({
    queryKey: albumKeys.detail(tripId, member, includeExcluded),
    queryFn: () => fetchAlbum(tripId, { member, includeExcluded }),
    enabled: !!tripId,
    staleTime: 1000 * 60,
  });
}

/** Members with memory on this trip (for the switcher). */
export function useContributors(tripId: string) {
  return useQuery({
    queryKey: albumKeys.contributors(tripId),
    queryFn: () => fetchContributors(tripId),
    enabled: !!tripId,
    staleTime: 1000 * 60,
  });
}

/** Edit your own album overrides (reorder / exclude / caption). */
export function useUpdateAlbum(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrides: UpdateAlbum) => updateAlbum(tripId, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: albumKeys.all(tripId) });
    },
  });
}

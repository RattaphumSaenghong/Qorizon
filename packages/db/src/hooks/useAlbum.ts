import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAlbum, updateAlbum } from '../queries/albums';
import type { UpdateAlbum } from '../types';

export const albumKeys = {
  all: (tripId: string) => ['album', tripId] as const,
  detail: (tripId: string, includeExcluded = false) =>
    ['album', tripId, includeExcluded] as const,
};

/** A trip's album (derived from its visited media).
 *  `includeExcluded` (owner edit mode) also returns hidden media, flagged. */
export function useAlbum(tripId: string, includeExcluded = false) {
  return useQuery({
    queryKey: albumKeys.detail(tripId, includeExcluded),
    queryFn: () => fetchAlbum(tripId, includeExcluded),
    enabled: !!tripId,
    staleTime: 1000 * 60,
  });
}

/** Edit album overrides (reorder / exclude / caption). */
export function useUpdateAlbum(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrides: UpdateAlbum) => updateAlbum(tripId, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: albumKeys.all(tripId) });
    },
  });
}

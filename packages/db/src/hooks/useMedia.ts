import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  uploadMedia,
  uploadTripMedia,
  fetchPool,
  updateMedia,
  deleteMedia,
  type UploadMediaInput,
  type UpdateMediaInput,
} from '../queries/media';

export const mediaKeys = {
  pool: (tripId: string) => ['pool', tripId] as const,
};

/** Upload media to a stop; refreshes the trip's stops + album on success. */
export function useUploadMedia(stopId: string, tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadMediaInput) => uploadMedia(stopId, input),
    onSuccess: () => {
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: ['stops', 'trip', tripId] });
        queryClient.invalidateQueries({ queryKey: ['album', tripId] });
        queryClient.invalidateQueries({ queryKey: mediaKeys.pool(tripId) });
      }
    },
  });
}

/** Upload directly to the trip pool. */
export function useUploadTripMedia(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadMediaInput) => uploadTripMedia(tripId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.pool(tripId) });
    },
  });
}

/** The trip-level shared photo pool. */
export function usePool(tripId: string) {
  return useQuery({
    queryKey: mediaKeys.pool(tripId),
    queryFn: () => fetchPool(tripId),
    enabled: !!tripId,
    staleTime: 1000 * 30,
  });
}

/** Update visibility or stop assignment for a pool photo (uploader only). */
export function useUpdateMedia(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, input }: { mediaId: string; input: UpdateMediaInput }) =>
      updateMedia(mediaId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.pool(tripId) });
      queryClient.invalidateQueries({ queryKey: ['album', tripId] });
    },
  });
}

export function useDeleteMedia(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => deleteMedia(mediaId),
    onSuccess: () => {
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: ['stops', 'trip', tripId] });
        queryClient.invalidateQueries({ queryKey: ['album', tripId] });
        queryClient.invalidateQueries({ queryKey: mediaKeys.pool(tripId) });
      }
    },
  });
}

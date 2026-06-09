import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadMedia, deleteMedia, type UploadMediaInput } from '../queries/media';

/** Upload media to a stop; refreshes the trip's stops + album on success. */
export function useUploadMedia(stopId: string, tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadMediaInput) => uploadMedia(stopId, input),
    onSuccess: () => {
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: ['stops', 'trip', tripId] });
        queryClient.invalidateQueries({ queryKey: ['album', tripId] });
      }
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
      }
    },
  });
}

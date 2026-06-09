import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchComments, addComment, deleteComment } from '../queries/comments';

export const commentKeys = {
  list: (stopId: string) => ['comments', stopId] as const,
};

export function useComments(stopId: string, enabled = true) {
  return useQuery({
    queryKey: commentKeys.list(stopId),
    queryFn: () => fetchComments(stopId),
    enabled: enabled && !!stopId,
    staleTime: 1000 * 15,
  });
}

export function useAddComment(stopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => addComment(stopId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(stopId) });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useDeleteComment(stopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(stopId) });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

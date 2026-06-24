import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMessages, sendMessage, deleteMessage } from '../queries/messages';

export const messageKeys = {
  list: (tripId: string) => ['messages', tripId] as const,
};

/** Trip chat. Polls every 5s while `enabled` (i.e. the chat panel is open). */
export function useMessages(tripId: string, enabled = true) {
  return useQuery({
    queryKey: messageKeys.list(tripId),
    queryFn: () => fetchMessages(tripId),
    enabled: enabled && !!tripId,
    refetchInterval: enabled ? 5000 : false,
    staleTime: 0,
  });
}

export function useSendMessage(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage(tripId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.list(tripId) });
    },
  });
}

export function useDeleteMessage(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.list(tripId) });
    },
  });
}

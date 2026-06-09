import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSaved, saveItem, unsaveItem, toggleSave } from '../queries/saved';

export const savedKeys = { list: ['saved'] as const };

export function useSaved() {
  return useQuery({
    queryKey: savedKeys.list,
    queryFn: () => fetchSaved(),
    staleTime: 1000 * 30,
  });
}

export function useSaveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { stop_id?: string; trip_id?: string }) => saveItem(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: savedKeys.list }),
  });
}

export function useUnsaveItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unsaveItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: savedKeys.list }),
  });
}

/** Toggle a bookmark by target (feed/journal/explore button). */
export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { stop_id?: string; trip_id?: string }) => toggleSave(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedKeys.list });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
    },
  });
}

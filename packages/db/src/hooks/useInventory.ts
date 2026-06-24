import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dismissInventoryItem, fetchInventory, matchInventoryItem } from '../queries/inventory';
import type { BookingType } from '../types';

export const inventoryKeys = {
  list: (type?: BookingType) => ['inventory', type ?? 'all'] as const,
};

export function useInventory(type?: BookingType) {
  return useQuery({
    queryKey: inventoryKeys.list(type),
    queryFn: () => fetchInventory(type),
    staleTime: 1000 * 30,
  });
}

export function useMatchInventoryItem(type?: BookingType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tripId }: { id: string; tripId: string }) => matchInventoryItem(id, tripId),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list(type) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list() });
      if (item.matched_stop_id) queryClient.invalidateQueries({ queryKey: ['stops'] });
    },
  });
}

export function useDismissInventoryItem(type?: BookingType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dismissInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list(type) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list() });
    },
  });
}

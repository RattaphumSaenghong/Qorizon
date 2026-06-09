import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchOffers,
  createBooking,
  fetchBookings,
  confirmBooking,
  cancelBooking,
} from '../queries/bookings';
import type { CreateBookingRequest, SearchBookingRequest } from '../types';

export const bookingKeys = {
  list: (tripId?: string) => ['bookings', tripId ?? 'all'] as const,
  search: (params: SearchBookingRequest) => ['bookings', 'search', params] as const,
};

/** Search live offers (flights or hotels). */
export function useOfferSearch(params: SearchBookingRequest, enabled = true) {
  return useQuery({
    queryKey: bookingKeys.search(params),
    queryFn: () => searchOffers(params),
    enabled,
    staleTime: 1000 * 60,
  });
}

/** The current user's bookings (optionally for one trip). */
export function useBookings(tripId?: string) {
  return useQuery({
    queryKey: bookingKeys.list(tripId),
    queryFn: () => fetchBookings(tripId),
    staleTime: 1000 * 30,
  });
}

export function useCreateBooking(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingRequest) => createBooking(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookingKeys.list(tripId) }),
  });
}

export function useConfirmBooking(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmBooking(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookingKeys.list(tripId) }),
  });
}

export function useCancelBooking(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bookingKeys.list(tripId) }),
  });
}

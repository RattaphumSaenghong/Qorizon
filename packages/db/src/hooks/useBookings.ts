import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchOffers,
  createBooking,
  fetchBooking,
  fetchBookings,
  confirmBooking,
  cancelBooking,
} from '../queries/bookings';
import type { CreateBookingRequest, SearchBookingRequest } from '../types';

export const bookingKeys = {
  list: (tripId?: string) => ['bookings', tripId ?? 'all'] as const,
  detail: (id: string) => ['bookings', 'detail', id] as const,
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

/** A single booking for the detail screen. */
export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => fetchBooking(id),
    enabled: !!id,
    staleTime: 1000 * 30,
  });
}

export function useCreateBooking(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingRequest) => createBooking(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.list(tripId) });
      // booking may have created a logistics stop in the itinerary
      if (tripId) queryClient.invalidateQueries({ queryKey: ['stops', 'trip', tripId] });
    },
  });
}

export function useConfirmBooking(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => confirmBooking(id),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.list(tripId) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(row.id) });
    },
  });
}

export function useCancelBooking(tripId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.list(tripId) });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(row.id) });
    },
  });
}

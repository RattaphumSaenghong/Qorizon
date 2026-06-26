import { request } from '../http';
import type {
  BookingDetailRow,
  BookingOffer,
  BookingRow,
  CreateBookingRequest,
  SearchBookingRequest,
} from '../types';

/** Search live offers (flights/hotels) via the active provider. */
export async function searchOffers(params: SearchBookingRequest): Promise<BookingOffer[]> {
  return request<BookingOffer[]>('POST', '/bookings/search', params);
}

/** Book an offer (creates a pending booking). */
export async function createBooking(input: CreateBookingRequest): Promise<BookingRow> {
  return request<BookingRow>('POST', '/bookings', input);
}

/** The current user's bookings (optionally for one trip). */
export async function fetchBookings(tripId?: string): Promise<BookingRow[]> {
  const q = tripId ? `?trip_id=${tripId}` : '';
  return request<BookingRow[]>('GET', `/bookings${q}`);
}

/** A single booking with its provider meta and confirmation payload. */
export async function fetchBooking(id: string): Promise<BookingDetailRow> {
  return request<BookingDetailRow>('GET', `/bookings/${id}`);
}

export async function confirmBooking(id: string): Promise<BookingRow> {
  return request<BookingRow>('POST', `/bookings/${id}/confirm`);
}

export async function cancelBooking(id: string): Promise<BookingRow> {
  return request<BookingRow>('POST', `/bookings/${id}/cancel`);
}

export async function fetchPriceCalendar(
  origin: string,
  destination: string,
  year: number,
  month: number,
): Promise<Record<string, number>> {
  return request<Record<string, number>>(
    'GET',
    `/bookings/price-calendar?origin=${origin}&destination=${destination}&year=${year}&month=${month}`,
  );
}

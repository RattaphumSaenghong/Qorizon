import type { BookingOffer } from '@trailr/shared';

/** Swap booking providers (mock, Amadeus, Agoda) without touching the service. */
export const BOOKING_PROVIDER = Symbol('BOOKING_PROVIDER');

export interface FlightSearch {
  origin?: string;
  destination?: string;
  depart_date?: string;
}
export interface HotelSearch {
  city?: string;
  check_in?: string;
  nights?: number;
}

export interface BookingProviderApi {
  readonly name: string;
  searchFlights(params: FlightSearch): Promise<BookingOffer[]>;
  searchHotels(params: HotelSearch): Promise<BookingOffer[]>;
}

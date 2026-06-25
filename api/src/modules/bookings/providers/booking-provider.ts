import type {
  BookingConfirmation,
  BookingOffer,
  GuestDetails,
  PassengerDetails,
} from '@trailr/shared';

export const FLIGHT_PROVIDER = Symbol('FLIGHT_PROVIDER');
export const HOTEL_PROVIDER = Symbol('HOTEL_PROVIDER');

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
export interface HotelCatalogQuery {
  latitude: number;
  longitude: number;
  radiusM: number;
  limit?: number;
}
export interface HotelPin {
  hotel_id: string;
  name: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  stars: number | null;
  thumbnail?: string;
  address?: string;
}
export interface HotelRatesQuery {
  hotelIds: string[];
  check_in: string;
  check_out: string;
  adults?: number;
}

export interface FlightProviderApi {
  readonly name: string;
  searchFlights(params: FlightSearch): Promise<BookingOffer[]>;
  bookFlight(offerId: string, passengerDetails?: PassengerDetails): Promise<BookingConfirmation>;
}

export interface HotelProviderApi {
  readonly name: string;
  searchHotels(params: HotelSearch): Promise<BookingOffer[]>;
  searchHotelCatalog(params: HotelCatalogQuery): Promise<HotelPin[]>;
  searchHotelRates(params: HotelRatesQuery): Promise<BookingOffer[]>;
  bookHotel(rateId: string, guestDetails?: GuestDetails): Promise<BookingConfirmation>;
}

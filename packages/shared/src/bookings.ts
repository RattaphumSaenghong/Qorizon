export const BOOKING_TYPE = ['flight', 'hotel'] as const;
export type BookingType = (typeof BOOKING_TYPE)[number];

export const BOOKING_PROVIDER = ['amadeus', 'agoda', 'booking_com', 'mock'] as const;
export type BookingProvider = (typeof BOOKING_PROVIDER)[number];

export const BOOKING_STATUS = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

/** A bookable offer returned from a provider search (not persisted until booked). */
export interface BookingOffer {
  id: string; // provider offer id → stored as external_ref
  type: BookingType;
  provider: BookingProvider;
  title: string; // "BKK → KIX" or "Shinjuku Granbell Hotel"
  subtitle: string; // "1 May · 1 stop · 7h 20m" or "★ 8.9 · Shinjuku"
  amount_thb: number;
  latitude?: number;
  longitude?: number;
  meta?: Record<string, unknown>;
}

export interface SearchBookingRequest {
  type: BookingType;
  trip_id?: string;
  // flight
  origin?: string;
  destination?: string;
  depart_date?: string;
  // hotel
  city?: string;
  check_in?: string;
  nights?: number;
}

export interface CreateBookingRequest {
  type: BookingType;
  provider: BookingProvider;
  trip_id?: string;
  external_ref?: string;
  amount_thb: number;
  title?: string;
  meta?: Record<string, unknown>;
}

export interface BookingRow {
  id: string;
  user_id: string;
  trip_id: string | null;
  type: BookingType;
  provider: BookingProvider;
  external_ref: string | null;
  status: BookingStatus;
  amount_thb: number | null;
  commission_thb: number | null;
  title: string | null; // surfaced from raw_payload for display
  created_at: string;
}

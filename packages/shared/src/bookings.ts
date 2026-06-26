export const BOOKING_TYPE = ['flight', 'hotel'] as const;
export type BookingType = (typeof BOOKING_TYPE)[number];

export const BOOKING_PROVIDER = ['duffel', 'liteapi', 'email', 'mock'] as const;
export type BookingProvider = (typeof BOOKING_PROVIDER)[number];

export const BOOKING_STATUS = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];
export const INVENTORY_STATUS = ['unmatched', 'matched', 'dismissed'] as const;
export type InventoryStatus = (typeof INVENTORY_STATUS)[number];

export interface FlightSummary {
  origin: string;
  destination: string;
  dep_at: string | null;
  arr_at: string | null;
  carrier: string | null;
  carrier_name: string | null;
  flight_number: string | null;
  stops: number;
  // Provider's true elapsed time (e.g. ISO "PT6H7M"). Authoritative — dep_at/arr_at
  // are tz-naive local times, so wall-clock subtraction between them is wrong across timezones.
  duration?: string | null;
}

export interface FlightSegment {
  origin: string | null;
  destination: string | null;
  departing_at: string | null;
  arriving_at: string | null;
  carrier: string | null;
  carrier_name: string | null;
  flight_number: string | null;
}

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
  rating?: number; // provider review score (hotels); scale is provider-defined (~0–10)
  meta?: Record<string, unknown>;
}

export interface SearchBookingRequest {
  type: BookingType;
  trip_id?: string;
  // flight
  origin?: string;
  destination?: string;
  depart_date?: string;
  return_date?: string;
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
  assignee_ids?: string[];
  passenger_details?: PassengerDetails;
  guest_details?: GuestDetails;
}

export interface PassengerDetails {
  title?: string;
  given_name: string;
  family_name: string;
  born_on?: string;
  gender?: string;
  email?: string;
  phone_number?: string;
}

export interface GuestDetails {
  given_name: string;
  family_name: string;
  email?: string;
  phone_number?: string;
}

export interface BookingConfirmation {
  external_ref: string;
  status?: BookingStatus;
  raw?: Record<string, unknown>;
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

export interface BookingDetailRow extends BookingRow {
  stop_id: string | null;
  meta: Record<string, unknown> | null;
  confirmation: Record<string, unknown> | null;
}

export interface InventoryItemRow {
  id: string;
  user_id: string;
  source: string;
  type: BookingType;
  parsed: Record<string, unknown>;
  status: InventoryStatus;
  matched_stop_id: string | null;
  received_at: string;
}

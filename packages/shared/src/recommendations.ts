import type { BookingProvider } from './bookings';

/** A hotel scored against a trip's itinerary, transit and budget. */
export interface HotelRecommendation {
  offer_id: string; // provider offer id → feeds the existing POST /bookings flow
  provider: BookingProvider;
  name: string;
  latitude: number;
  longitude: number;
  nightly_thb: number;
  total_thb: number;
  rating: number | null;
  score: number; // 0–1 weighted blend
  avg_km_to_stops: number;
  station_name?: string; // transit (Phase 3) — nearest rail station
  station_meters?: number;
  why: string; // human-readable one-liner
}

export interface HotelRecommendationsResponse {
  /** True when attractions are too geographically spread for one hotel; items is empty. */
  multi_area: boolean;
  anchor: { latitude: number; longitude: number } | null;
  nights: number;
  nightly_cap_thb: number | null;
  items: HotelRecommendation[];
}

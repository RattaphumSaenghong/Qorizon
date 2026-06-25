/**
 * Trip Builder — shared types, constants, and pure helpers.
 * Extracted from app/builder/[id].tsx so the screen stays focused on state + render.
 */
import type { BookingRow, HotelRecommendation, StopWithMedia } from '@trailr/db';
import type { PlaceSuggestion } from '../lib/places';

export type Suggestion = PlaceSuggestion;

export const CATEGORIES = ['place', 'food', 'landmark', 'activity', 'hotel', 'flight', 'transport', 'note'] as const;
export type Category = (typeof CATEGORIES)[number];
export type LogisticsType = 'flight' | 'hotel';
export type StaySort = 'score' | 'price' | 'distance' | 'transit';
export type BuilderSideTab = 'stays' | 'backpack';

export const STAY_SORTS: { key: StaySort; label: string }[] = [
  { key: 'score', label: 'Best' },
  { key: 'price', label: 'Price' },
  { key: 'distance', label: 'Near stops' },
  { key: 'transit', label: 'Transit' },
];

export interface BuilderDay {
  id: string;
  n: number;
  place: string;
  date: string | null;
  stops: StopWithMedia[];
}

export interface Coord {
  latitude: number;
  longitude: number;
}

export function sortStayRecs(items: HotelRecommendation[], sort: StaySort): HotelRecommendation[] {
  const copy = [...items];
  if (sort === 'price') return copy.sort((a, b) => a.nightly_thb - b.nightly_thb);
  if (sort === 'distance') return copy.sort((a, b) => a.avg_km_to_stops - b.avg_km_to_stops);
  if (sort === 'transit') {
    return copy.sort((a, b) => (a.station_meters ?? Infinity) - (b.station_meters ?? Infinity));
  }
  return copy.sort((a, b) => b.score - a.score);
}

export function stayPriceLabel(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}

export function parsePositiveInt(text: string): number | undefined {
  const n = Number(text.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export function bookingTitle(booking: BookingRow): string {
  if (booking.title) return booking.title;
  return booking.type === 'flight' ? 'Flight booking' : 'Hotel booking';
}

export function isLogistics(stop: StopWithMedia): boolean {
  return stop.category === 'flight' || stop.category === 'hotel';
}

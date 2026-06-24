import type { ForkMode, LiveCadence, TransportMode, TripStatus, TripVisibility } from './enums';

/** Minimal author embed used by trip/stop responses. */
export interface Author {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Same shape, aliased for contexts where "author" would be confusing (assignees, contributors). */
export type AuthorLite = Author;

export interface TripRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: TripStatus;
  stage: 'planning' | 'living' | 'album';
  transport_mode: TransportMode;
  destination: string | null;
  budget: number | null;
  budget_currency: string;
  live_mode: boolean;
  live_cadence: LiveCadence;
  visibility: TripVisibility;
  forked_from_id: string | null;
  fork_count: number;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface TripWithAuthor extends TripRow {
  author: Author;
}

export interface TripDayRow {
  id: string;
  trip_id: string;
  day_number: number;
  place: string | null;
  date: string | null; // YYYY-MM-DD
}

export interface CreateTripRequest {
  title: string;
  description?: string;
  cover_image_url?: string;
  status?: TripStatus;
  stage?: 'planning' | 'living' | 'album';
  transport_mode?: TransportMode;
  destination?: string;
  budget?: number;
  budget_currency?: string;
  live_mode?: boolean;
  live_cadence?: LiveCadence;
  visibility?: TripVisibility;
  start_date?: string;
  end_date?: string;
  backdated?: boolean;
}

export type UpdateTripRequest = Partial<CreateTripRequest>;

export interface ForkRequest {
  mode: ForkMode;
}

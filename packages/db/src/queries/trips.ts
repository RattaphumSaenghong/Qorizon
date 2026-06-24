import { request } from '../http';
import type { TripWithAuthor, InsertTrip, TripRow, TripDayRow, ForkMode } from '../types';

/** Fetch a single trip by ID, joined with its author. */
export async function fetchTrip(tripId: string): Promise<TripWithAuthor> {
  return request<TripWithAuthor>('GET', `/trips/${tripId}`);
}

/** Fetch the trips on a user's profile. Owner-only: pass includeArchived to see archived trips. */
export async function fetchUserTrips(
  userId: string,
  includeArchived = false,
): Promise<TripWithAuthor[]> {
  const qs = includeArchived ? '?includeArchived=true' : '';
  return request<TripWithAuthor[]>('GET', `/users/${userId}/trips${qs}`);
}

/** Trips from people the current user follows (home feed). userId is implicit (token). */
export async function fetchFollowingFeed(_userId: string, limit = 20): Promise<TripWithAuthor[]> {
  return request<TripWithAuthor[]>('GET', `/feed/trips?limit=${limit}`);
}

/** Create a new trip. The server sets the owner from the auth token. */
export async function createTrip(trip: InsertTrip): Promise<TripRow> {
  const {
    title, description, cover_image_url, status, stage, destination, budget, budget_currency,
    live_mode, live_cadence, visibility, start_date, end_date, backdated, transport_mode,
  } = trip as Partial<TripRow> & { backdated?: boolean };
  return request<TripRow>('POST', '/trips', {
    title,
    description,
    cover_image_url,
    status,
    stage,
    transport_mode,
    destination,
    budget,
    budget_currency,
    live_mode,
    live_cadence,
    visibility,
    start_date,
    end_date,
    backdated,
  });
}

/**
 * Fork a trip. Server copies the plan (stops reset to 'planned', story stripped),
 * applies skim/full, bumps fork_count — atomically. Owner = authenticated user.
 */
export async function forkTrip(
  sourceTripId: string,
  mode: ForkMode = 'full',
  _newUserId?: string,
): Promise<TripRow> {
  return request<TripRow>('POST', `/trips/${sourceTripId}/fork`, { mode });
}

/** Fetch a trip's days, ordered. */
export async function fetchTripDays(tripId: string): Promise<TripDayRow[]> {
  return request<TripDayRow[]>('GET', `/trips/${tripId}/days`);
}

/** Append a new day to a trip (owner only). */
export async function addTripDay(tripId: string): Promise<TripDayRow> {
  return request<TripDayRow>('POST', `/trips/${tripId}/days`);
}

/** Edit a day's label/date (owner only). Pass null to clear a field. */
export async function updateTripDay(
  tripId: string,
  dayId: string,
  patch: { place?: string | null; date?: string | null },
): Promise<TripDayRow> {
  return request<TripDayRow>('PATCH', `/trips/${tripId}/days/${dayId}`, patch);
}

/** Delete a day. Its stops move back to the unsorted pool server-side. */
export async function deleteTripDay(tripId: string, dayId: string): Promise<void> {
  await request<void>('DELETE', `/trips/${tripId}/days/${dayId}`);
}

/** Permanently delete a trip and all its content (owner only). */
export async function deleteTrip(tripId: string): Promise<void> {
  await request<void>('DELETE', `/trips/${tripId}`);
}

/** Update trip metadata (title, visibility, status, etc.). */
export async function updateTrip(
  tripId: string,
  updates: Partial<Omit<TripRow, 'id' | 'user_id' | 'created_at'>>,
): Promise<TripRow> {
  return request<TripRow>('PATCH', `/trips/${tripId}`, updates);
}

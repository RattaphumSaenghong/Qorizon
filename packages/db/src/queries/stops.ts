import { request } from '../http';
import type { FeedStop, InsertStop, StopRow, StopWithMedia, StopStatus } from '../types';

/** A trip's stops with media. Optionally filter by lifecycle status. */
export async function fetchTripStops(
  tripId: string,
  status?: StopStatus,
): Promise<StopWithMedia[]> {
  const q = status ? `?status=${status}` : '';
  return request<StopWithMedia[]>('GET', `/trips/${tripId}/stops${q}`);
}

/** Home feed: recent VISITED stops from people the user follows. */
export async function fetchFeedStops(_userId: string, limit = 30): Promise<FeedStop[]> {
  return request<FeedStop[]>('GET', `/feed/stops?limit=${limit}`);
}

/** Public discover feed: visited stops from public trips (logged-out home + explore). */
export async function fetchPublicStops(limit = 30): Promise<FeedStop[]> {
  return request<FeedStop[]>('GET', `/feed/discover?limit=${limit}`);
}

/** Create a stop. The server sets the owner from the auth token. */
export async function createStop(stop: InsertStop): Promise<StopRow> {
  // user_id/id/batch_date are server-managed; strip them (the API rejects unknown props).
  const { user_id, id, batch_date, ...rest } = stop as InsertStop & { id?: string };
  void user_id;
  void id;
  void batch_date;
  return request<StopRow>('POST', '/stops', rest);
}

/** Mark a planned stop as visited (the plan→story transition). */
export async function markStopVisited(
  stopId: string,
  fields?: { caption?: string; captured_at?: string },
): Promise<StopRow> {
  return request<StopRow>('PATCH', `/stops/${stopId}`, { status: 'visited', ...fields });
}

/** Edit a planned stop's fields (builder). Only the provided keys change. */
export async function updateStop(
  stopId: string,
  patch: Partial<{
    day_id: string;
    status: StopStatus;
    category: string;
    location_name: string;
    latitude: number;
    longitude: number;
    planned_time: string;
    duration_mins: number;
    sort_order: number;
    notes: string;
    caption: string;
  }>,
): Promise<StopRow> {
  return request<StopRow>('PATCH', `/stops/${stopId}`, patch);
}

/** Remove a stop. */
export async function deleteStop(stopId: string): Promise<void> {
  await request<void>('DELETE', `/stops/${stopId}`);
}

/** Toggle like on a stop. Returns the new like state. */
export async function toggleLike(_userId: string, stopId: string): Promise<boolean> {
  const res = await request<{ is_liked: boolean }>('POST', `/stops/${stopId}/like`);
  return res.is_liked;
}

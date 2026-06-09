import type { StopWithMedia } from './stops';
import type { TripWithAuthor } from './trips';

/** A bookmarked stop or trip. Exactly one of stop/trip is set. */
export interface SavedItem {
  id: string;
  created_at: string;
  stop: StopWithMedia | null;
  trip: TripWithAuthor | null;
}

export interface SaveRequest {
  stop_id?: string;
  trip_id?: string;
}

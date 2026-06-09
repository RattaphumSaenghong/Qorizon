import type { LiveCadence } from './enums';

export interface TrailPointRow {
  id: string;
  trip_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  recorded_at: string;
}

export interface TrailPointInput {
  latitude: number;
  longitude: number;
  altitude?: number;
  recorded_at?: string;
}

export interface PostTrailRequest {
  points: TrailPointInput[];
}

export interface LiveBatchRow {
  id: string;
  trip_id: string;
  batch_date: string; // YYYY-MM-DD
  title: string | null;
  stop_ids: string[];
  published_at: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface PublishBatchRequest {
  batch_date?: string; // defaults to today; groups that day's visited stops
  title?: string;
  stop_ids?: string[]; // explicit override
}

export interface SetLiveModeRequest {
  live_mode: boolean;
  live_cadence?: LiveCadence;
}

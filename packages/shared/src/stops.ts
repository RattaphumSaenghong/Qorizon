import type { MediaType, MediaVisibility, StopCategory, StopStatus } from './enums';
import type { Author, AuthorLite } from './trips';

export type StopScope = 'shared' | 'assigned';

export interface MediaRow {
  id: string;
  trip_id: string;
  stop_id: string | null;
  user_id: string;
  type: MediaType;
  visibility: MediaVisibility;
  url: string;
  cdn_url: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  duration_secs: number | null;
  size_bytes: number | null;
  sort_order: number;
  created_at: string;
}

export interface StopRow {
  id: string;
  trip_id: string;
  day_id: string | null;
  user_id: string;
  status: StopStatus;
  scope: StopScope;
  category: StopCategory;
  assignees: AuthorLite[];
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  planned_start: string | null;
  planned_end: string | null;
  duration_mins: number | null;
  cost: number | null;
  paid_by: string | null;
  sort_order: number;
  notes: string | null;
  caption: string | null;
  captured_at: string | null;
  batch_date: string | null; // YYYY-MM-DD
  feed_eligible: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface StopWithMedia extends StopRow {
  media: MediaRow[];
  author: Author;
}

/** Feed item: a visited stop enriched with its trip + the viewer's like/save state. */
export interface FeedStop extends StopWithMedia {
  trip: { id: string; title: string; cover_image_url: string | null };
  is_liked: boolean;
  is_saved: boolean;
}

export interface CreateStopRequest {
  trip_id: string;
  day_id?: string;
  status?: StopStatus;
  scope?: StopScope;
  assignee_ids?: string[];
  category?: StopCategory;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  planned_start?: string;
  planned_end?: string;
  duration_mins?: number;
  cost?: number;
  paid_by?: string;
  sort_order?: number;
  notes?: string;
  caption?: string;
  captured_at?: string;
}

export type UpdateStopRequest = Partial<Omit<CreateStopRequest, 'trip_id'>> & {
  paid_by?: string | null;
};

export interface LikeStateResponse {
  is_liked: boolean;
}

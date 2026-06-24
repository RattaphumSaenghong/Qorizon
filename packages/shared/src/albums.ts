import type { MediaType, MediaVisibility } from './enums';
import type { Author } from './trips';

/**
 * User edits layered over a trip's derived album. Stored in trips.album_overrides.
 *   order    — explicit media ordering (media ids); unlisted media follow, in stop order
 *   captions — per-photo caption override (media id → text)
 *   excluded — media ids hidden from the album
 *   included — shared pool media from OTHER members pulled into this album
 */
export interface AlbumOverrides {
  order?: string[];
  captions?: Record<string, string>;
  excluded?: string[];
  included?: string[];
}

/** One photo/video in the assembled album. */
export interface AlbumItem {
  media_id: string;
  stop_id: string | null;
  type: MediaType;
  url: string;
  cdn_url: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  location_name: string | null;
  caption: string | null;
  excluded: boolean;
}

/** An album is a derived view of a trip — never its own entity. */
export interface Album {
  trip: { id: string; title: string; cover_image_url: string | null; user_id: string };
  author: Author;
  items: AlbumItem[];
  count: number;
}

/** A photo in the trip-level shared pool. */
export interface PoolItem {
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
  location_name: string | null;
  sort_order: number;
  created_at: string;
}

export interface UploadTripMediaRequest {
  type: MediaType;
  content_base64: string;
  content_type: string;
  visibility?: MediaVisibility;
  stop_id?: string;
  latitude?: number;
  longitude?: number;
  captured_at?: string;
}

export interface UpdateMediaRequest {
  visibility?: MediaVisibility;
  stop_id?: string | null;
}

export type UpdateAlbumRequest = AlbumOverrides;

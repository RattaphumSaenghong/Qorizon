import type { MediaType } from './enums';
import type { Author } from './trips';

/**
 * User edits layered over a trip's derived album. Stored in trips.album_overrides.
 *   order    — explicit media ordering (media ids); unlisted media follow, in stop order
 *   captions — per-photo caption override (media id → text)
 *   excluded — media ids hidden from the album
 */
export interface AlbumOverrides {
  order?: string[];
  captions?: Record<string, string>;
  excluded?: string[];
}

/** One photo/video in the assembled album. */
export interface AlbumItem {
  media_id: string;
  stop_id: string;
  type: MediaType;
  url: string;
  cdn_url: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  location_name: string | null; // from the owning stop
  caption: string | null; // override caption ?? stop caption
  excluded: boolean; // hidden from the public album (only returned with ?include_excluded)
}

/** An album is a derived view of a trip — never its own entity. */
export interface Album {
  trip: { id: string; title: string; cover_image_url: string | null; user_id: string };
  author: Author;
  items: AlbumItem[];
  count: number;
}

export type UpdateAlbumRequest = AlbumOverrides;

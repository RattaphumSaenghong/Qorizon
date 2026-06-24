import { request } from '../http';
import type { MediaRow, MediaType, MediaVisibility, PoolItem } from '../types';

export interface UploadMediaInput {
  type: MediaType;
  content_base64: string; // base64 (data: URL prefix tolerated)
  content_type: string; // e.g. image/jpeg
  visibility?: MediaVisibility;
  stop_id?: string;
  latitude?: number;
  longitude?: number;
  captured_at?: string;
}

export interface UpdateMediaInput {
  visibility?: MediaVisibility;
  stop_id?: string | null;
}

/** Upload media to a stop (owner). Proxies bytes through the API to storage. */
export async function uploadMedia(stopId: string, input: UploadMediaInput): Promise<MediaRow> {
  return request<MediaRow>('POST', `/stops/${stopId}/media`, input);
}

/** Upload media directly to the trip pool (no stop required). */
export async function uploadTripMedia(tripId: string, input: UploadMediaInput): Promise<MediaRow> {
  return request<MediaRow>('POST', `/trips/${tripId}/media`, input);
}

/** Fetch the trip-level shared pool (+ uploader's own private photos when authenticated). */
export async function fetchPool(tripId: string): Promise<PoolItem[]> {
  return request<PoolItem[]>('GET', `/trips/${tripId}/pool`);
}

/** Update visibility or stop assignment for a media item (uploader only). */
export async function updateMedia(mediaId: string, input: UpdateMediaInput): Promise<MediaRow> {
  return request<MediaRow>('PATCH', `/media/${mediaId}`, input);
}

/** Delete media (uploader). */
export async function deleteMedia(mediaId: string): Promise<void> {
  await request<void>('DELETE', `/media/${mediaId}`);
}

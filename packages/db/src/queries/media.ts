import { request } from '../http';
import type { MediaRow, MediaType } from '../types';

export interface UploadMediaInput {
  type: MediaType;
  content_base64: string; // base64 (data: URL prefix tolerated)
  content_type: string; // e.g. image/jpeg
  latitude?: number;
  longitude?: number;
  captured_at?: string;
}

/** Upload media to a stop (owner). Proxies bytes through the API to storage. */
export async function uploadMedia(stopId: string, input: UploadMediaInput): Promise<MediaRow> {
  return request<MediaRow>('POST', `/stops/${stopId}/media`, input);
}

/** Delete media (uploader). */
export async function deleteMedia(mediaId: string): Promise<void> {
  await request<void>('DELETE', `/media/${mediaId}`);
}

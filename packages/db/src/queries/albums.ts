import { request } from '../http';
import type { Album, UpdateAlbum } from '../types';

/** Assemble a trip's album (visited media + overrides applied).
 *  `includeExcluded` returns hidden media too (owner-only) for the edit UI. */
export async function fetchAlbum(tripId: string, includeExcluded = false): Promise<Album> {
  const qs = includeExcluded ? '?include_excluded=1' : '';
  return request<Album>('GET', `/trips/${tripId}/album${qs}`);
}

/** Edit album overrides (reorder / exclude / caption). Owner only. */
export async function updateAlbum(tripId: string, overrides: UpdateAlbum): Promise<Album> {
  return request<Album>('PATCH', `/trips/${tripId}/album`, overrides);
}

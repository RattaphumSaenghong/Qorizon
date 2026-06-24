import { request } from '../http';
import type { Album, AuthorLite, UpdateAlbum } from '../types';

interface AlbumOpts {
  member?: string | null;     // whose album (defaults to the trip owner's)
  includeExcluded?: boolean;  // hidden media too (your own edit mode)
}

/** Assemble a member's personal album (their visited media + their overrides). */
export async function fetchAlbum(tripId: string, opts: AlbumOpts = {}): Promise<Album> {
  const params = new URLSearchParams();
  if (opts.member) params.set('member', opts.member);
  if (opts.includeExcluded) params.set('include_excluded', '1');
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<Album>('GET', `/trips/${tripId}/album${qs}`);
}

/** Members with memory on this trip (for the album/journal switcher). */
export async function fetchContributors(tripId: string): Promise<AuthorLite[]> {
  return request<AuthorLite[]>('GET', `/trips/${tripId}/contributors`);
}

/** Edit your own album overrides (reorder / exclude / caption). */
export async function updateAlbum(tripId: string, overrides: UpdateAlbum): Promise<Album> {
  return request<Album>('PATCH', `/trips/${tripId}/album`, overrides);
}

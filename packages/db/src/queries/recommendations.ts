import { request } from '../http';
import type { HotelRecommendationsResponse, HotelRecsParams } from '../types';

/** Itinerary-scored hotel recommendations for a trip (owner/collaborator only). */
export async function fetchHotelRecommendations(
  tripId: string,
  params: HotelRecsParams = {},
): Promise<HotelRecommendationsResponse> {
  const q = new URLSearchParams();
  if (params.check_in) q.set('checkIn', params.check_in);
  if (params.check_out) q.set('checkOut', params.check_out);
  if (params.guests != null) q.set('guests', String(params.guests));
  if (params.nightly_cap != null) q.set('nightlyCap', String(params.nightly_cap));
  const qs = q.toString();
  return request<HotelRecommendationsResponse>(
    'GET',
    `/trips/${tripId}/hotel-recommendations${qs ? `?${qs}` : ''}`,
  );
}

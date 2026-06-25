import { useQuery } from '@tanstack/react-query';
import { fetchHotelRecommendations } from '../queries/recommendations';
import type { HotelRecsParams } from '../types';

/** Hotel recommendations scored on the trip's itinerary. Enabled while the
 *  sheet is open; re-runs when the editable nightly cap (or dates) change. */
export function useHotelRecommendations(tripId: string, params: HotelRecsParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['hotel-recs', tripId, params],
    queryFn: () => fetchHotelRecommendations(tripId, params),
    enabled: enabled && !!tripId,
    staleTime: 1000 * 60,
  });
}

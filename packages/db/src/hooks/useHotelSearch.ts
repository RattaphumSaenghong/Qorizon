import { useQuery } from '@tanstack/react-query';
import { searchHotelCatalog, searchHotelRates } from '../queries/hotel-search';
import type { HotelCatalogQuery, HotelRatesQuery } from '../types';

export const hotelSearchKeys = {
  catalog: (q: HotelCatalogQuery) => ['hotels', 'catalog', q] as const,
  rates: (q: HotelRatesQuery) => ['hotels', 'rates', q] as const,
};

export function useHotelCatalog(q: HotelCatalogQuery, enabled = false) {
  return useQuery({
    queryKey: hotelSearchKeys.catalog(q),
    queryFn: () => searchHotelCatalog(q),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useHotelRates(q: HotelRatesQuery, enabled = false) {
  return useQuery({
    queryKey: hotelSearchKeys.rates(q),
    queryFn: () => searchHotelRates(q),
    enabled,
    staleTime: 1000 * 60,
  });
}

import { request } from '../http';
import type { BookingOffer, HotelCatalogQuery, HotelPin, HotelRatesQuery } from '../types';

export async function searchHotelCatalog(q: HotelCatalogQuery): Promise<HotelPin[]> {
  const params = new URLSearchParams({
    lat: String(q.latitude),
    lng: String(q.longitude),
    radius: String(q.radiusM),
    limit: String(q.limit ?? 50),
  });
  return request<HotelPin[]>('GET', `/hotels/catalog?${params}`);
}

export async function searchHotelRates(q: HotelRatesQuery): Promise<BookingOffer[]> {
  return request<BookingOffer[]>('POST', '/hotels/rates', q);
}

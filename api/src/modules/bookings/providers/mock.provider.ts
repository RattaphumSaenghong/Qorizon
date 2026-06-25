import type { BookingConfirmation, BookingOffer, GuestDetails, PassengerDetails } from '@trailr/shared';
import type {
  FlightProviderApi,
  FlightSearch,
  HotelCatalogQuery,
  HotelPin,
  HotelProviderApi,
  HotelRatesQuery,
  HotelSearch,
} from './booking-provider';

/** Deterministic offers for dev: no API keys, no network. */
export class MockFlightProvider implements FlightProviderApi {
  readonly name = 'mock';

  async searchFlights(p: FlightSearch): Promise<BookingOffer[]> {
    const o = p.origin ?? 'BKK';
    const d = p.destination ?? 'NRT';
    const airlines = [
      { code: 'TG', name: 'Thai Airways', stops: 0, dur: '6h 05m', price: 12400 },
      { code: 'JL', name: 'Japan Airlines', stops: 0, dur: '6h 20m', price: 11900 },
      { code: 'D7', name: 'AirAsia X', stops: 1, dur: '9h 40m', price: 7800 },
    ];
    return airlines.map((a, i) => ({
      id: `mock-fl-${o}-${d}-${a.code}`,
      type: 'flight' as const,
      provider: 'mock' as const,
      title: `${o} -> ${d}`,
      subtitle: `${a.name} · ${a.stops === 0 ? 'non-stop' : `${a.stops} stop`} · ${a.dur}`,
      amount_thb: a.price,
      meta: { airline: a.code, depart_date: p.depart_date, index: i },
    }));
  }

  async bookFlight(offerId: string, passengerDetails?: PassengerDetails): Promise<BookingConfirmation> {
    return {
      external_ref: `mock-order-${offerId}`,
      status: 'pending',
      raw: { passengerDetails },
    };
  }
}

export class MockHotelProvider implements HotelProviderApi {
  readonly name = 'mock';

  async searchHotels(p: HotelSearch): Promise<BookingOffer[]> {
    const city = p.city ?? 'Tokyo';
    const nights = p.nights ?? 3;
    const hotels = [
      { name: 'Shinjuku Granbell Hotel', star: 8.9, lat: 35.6938, lon: 139.7034, nightly: 2400 },
      { name: `${city} Riverside Inn`, star: 8.4, lat: 35.0116, lon: 135.7681, nightly: 1800 },
      { name: `${city} Capsule Stay`, star: 7.9, lat: 35.6595, lon: 139.7005, nightly: 950 },
    ];
    return hotels.map((h, i) => ({
      id: `mock-ht-${city}-${i}`,
      type: 'hotel' as const,
      provider: 'mock' as const,
      title: h.name,
      subtitle: `${h.star} rating · ${nights} nights · ${city}`,
      amount_thb: h.nightly * nights,
      latitude: h.lat,
      longitude: h.lon,
      rating: h.star,
      meta: { nightly: h.nightly, nights, check_in: p.check_in },
    }));
  }

  async searchHotelCatalog(p: HotelCatalogQuery): Promise<HotelPin[]> {
    const seeds = [
      { name: 'Neighborhood House', dx: 0.006, dy: 0.004, rating: 8.8, stars: 4 },
      { name: 'Station Rooms', dx: -0.005, dy: 0.007, rating: 8.4, stars: 3 },
      { name: 'Garden Stay', dx: 0.011, dy: -0.006, rating: 9.1, stars: 4 },
      { name: 'Tiny Capsule', dx: -0.012, dy: -0.004, rating: 7.9, stars: 2 },
      { name: 'Riverside Hotel', dx: 0.018, dy: 0.01, rating: 8.2, stars: 3 },
    ];
    return seeds.slice(0, p.limit ?? seeds.length).map((h, i) => ({
      hotel_id: `mock-hotel-${i}`,
      name: h.name,
      latitude: p.latitude + h.dy,
      longitude: p.longitude + h.dx,
      rating: h.rating,
      stars: h.stars,
      address: 'Mock district',
    }));
  }

  async searchHotelRates(p: HotelRatesQuery): Promise<BookingOffer[]> {
    const nights = Math.max(1, Math.round((Date.parse(p.check_out) - Date.parse(p.check_in)) / 86_400_000));
    return p.hotelIds.map((id, i) => {
      const nightly = 1600 + i * 420;
      return {
        id: `mock-rate-${id}`,
        type: 'hotel' as const,
        provider: 'mock' as const,
        title: `Mock stay ${i + 1}`,
        subtitle: `${nights} nights - ${p.adults ?? 2} adults`,
        amount_thb: nightly * nights,
        rating: 8.2 + (i % 3) * 0.3,
        meta: {
          hotel_id: id,
          check_in: p.check_in,
          check_out: p.check_out,
          nights,
          nightly,
          pricing: {
            net: nightly * nights * 0.82,
            ssp: nightly * nights,
            currency: 'THB',
            basis: 'ssp',
            implied_markup: 0.22,
            flags: [],
            display_price: nightly * nights,
          },
        },
      };
    });
  }

  async bookHotel(rateId: string, guestDetails?: GuestDetails): Promise<BookingConfirmation> {
    return {
      external_ref: `mock-hotel-${rateId}`,
      status: 'pending',
      raw: { guestDetails },
    };
  }
}

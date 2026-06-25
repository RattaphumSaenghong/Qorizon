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
    const departDate = p.depart_date ?? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    const airlines = [
      { code: 'TG', name: 'Thai Airways', stops: 0, durationMins: 365, price: 12400, hour: 8 },
      { code: 'JL', name: 'Japan Airlines', stops: 0, durationMins: 380, price: 11900, hour: 10 },
      { code: 'D7', name: 'AirAsia X', stops: 1, durationMins: 580, price: 7800, hour: 13 },
    ];
    return airlines.map((a, i) => {
      const depAt = `${departDate}T${String(a.hour).padStart(2, '0')}:15:00`;
      const arrAt = addMinutes(depAt, a.durationMins);
      const flightNumber = String(500 + i);
      const segment = {
        origin: o,
        destination: d,
        departing_at: depAt,
        arriving_at: arrAt,
        carrier: a.code,
        carrier_name: a.name,
        flight_number: flightNumber,
      };
      return {
        id: `mock-fl-${o}-${d}-${a.code}`,
        type: 'flight' as const,
        provider: 'mock' as const,
        title: `${o} -> ${d}`,
        subtitle: `${a.name} - ${a.stops === 0 ? 'non-stop' : `${a.stops} stop`} - ${formatDuration(a.durationMins)}`,
        amount_thb: a.price,
        meta: {
          origin: o,
          destination: d,
          dep_at: depAt,
          arr_at: arrAt,
          carrier: a.code,
          carrier_name: a.name,
          flight_number: flightNumber,
          stops: a.stops,
          duration: formatDuration(a.durationMins),
          segments: [segment],
          index: i,
        },
      };
    });
  }

  async bookFlight(offerId: string, passengerDetails?: PassengerDetails): Promise<BookingConfirmation> {
    return {
      external_ref: `mock-order-${offerId}`,
      status: 'pending',
      raw: { passengerDetails },
    };
  }
}

function addMinutes(isoLocal: string, minutes: number): string {
  const match = isoLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return isoLocal;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second ?? 0));
  date.setMinutes(date.getMinutes() + minutes);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-') + `T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
      subtitle: `${h.star} rating - ${nights} nights - ${city}`,
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

import { ConfigService } from '@nestjs/config';
import type { BookingConfirmation, BookingOffer, GuestDetails } from '@trailr/shared';
import type { HotelProviderApi, HotelSearch } from './booking-provider';

interface LiteHotel {
  id?: string;
  hotelId?: string;
  name?: string;
  hotelName?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  minRate?: number;
  price?: number;
  currency?: string;
}

interface LiteRate {
  id?: string;
  rateId?: string;
  price?: number;
  amount?: number;
  total?: number;
  currency?: string;
  boardName?: string;
  roomName?: string;
}

export class LiteApiHotelProvider implements HotelProviderApi {
  readonly name = 'liteapi';
  private readonly base = 'https://api.liteapi.travel/v3.0';

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    return this.config.get<string>('LITEAPI_KEY')!;
  }

  private get thbRate(): number {
    return Number(this.config.get('BOOKING_USD_THB_RATE') ?? 36);
  }

  private headers(): Record<string, string> {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async searchHotels(p: HotelSearch): Promise<BookingOffer[]> {
    const city = p.city ?? 'Tokyo';
    const nights = Math.max(1, p.nights ?? 1);
    const checkIn = p.check_in ?? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    const checkOut = new Date(new Date(checkIn).getTime() + nights * 864e5).toISOString().slice(0, 10);

    const search = new URLSearchParams({
      cityName: city,
      checkin: checkIn,
      checkout: checkOut,
      adults: '1',
      limit: '5',
    });
    const hotelsRes = await fetch(`${this.base}/hotels?${search}`, { headers: this.headers() });
    if (!hotelsRes.ok) throw new Error(`LiteAPI hotel search failed: ${hotelsRes.status}`);
    const hotelsData = (await hotelsRes.json()) as { data?: LiteHotel[]; hotels?: LiteHotel[] };
    const hotels = hotelsData.data ?? hotelsData.hotels ?? [];

    return hotels.slice(0, 5).map((hotel, i) => {
      const hotelId = hotel.id ?? hotel.hotelId ?? `${city}-${i}`;
      const amount = Number(hotel.minRate ?? hotel.price ?? 0);
      const currency = hotel.currency ?? 'USD';
      const amountThb = currency === 'THB' ? amount : amount * this.thbRate;
      return {
        id: hotelId,
        type: 'hotel' as const,
        provider: 'liteapi' as const,
        title: hotel.name ?? hotel.hotelName ?? `${city} stay`,
        subtitle: `${nights} nights · ${hotel.address ?? hotel.city ?? city}`,
        amount_thb: Math.round(amountThb || 0),
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        meta: {
          hotel_id: hotelId,
          check_in: checkIn,
          check_out: checkOut,
          nights,
          raw: hotel,
        },
      };
    });
  }

  async bookHotel(rateId: string, guestDetails?: GuestDetails): Promise<BookingConfirmation> {
    if (!guestDetails) {
      return { external_ref: rateId, status: 'pending', raw: { deferred: true } };
    }

    const prebookRes = await fetch(`${this.base}/book`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        rateId,
        guest: {
          firstName: guestDetails.given_name,
          lastName: guestDetails.family_name,
          email: guestDetails.email,
          phone: guestDetails.phone_number,
        },
      }),
    });
    if (!prebookRes.ok) throw new Error(`LiteAPI prebook failed: ${prebookRes.status}`);
    const prebook = (await prebookRes.json()) as { data?: LiteRate & { bookingId?: string }; bookingId?: string };
    const bookingId = prebook.bookingId ?? prebook.data?.bookingId ?? rateId;

    const confirmRes = await fetch(`${this.base}/confirm`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ bookingId }),
    });
    if (!confirmRes.ok) throw new Error(`LiteAPI confirm failed: ${confirmRes.status}`);
    const confirmed = (await confirmRes.json()) as Record<string, unknown>;
    return { external_ref: bookingId, status: 'confirmed', raw: confirmed };
  }
}

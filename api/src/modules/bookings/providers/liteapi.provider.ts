import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { BookingConfirmation, BookingOffer, GuestDetails } from '@trailr/shared';
import { FxService } from '../../fx/fx.service';
import { computeHotelDisplayPrice } from '../pricing/hotel-pricing';
import type {
  HotelCatalogQuery,
  HotelPin,
  HotelProviderApi,
  HotelRatesQuery,
  HotelSearch,
} from './booking-provider';

interface LiteHotel {
  id?: string;
  hotelId?: string;
  name?: string;
  hotelName?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  stars?: number;
  rating?: number;
  main_photo?: string;
  thumbnail?: string;
}

interface LiteMoney {
  amount?: number | string;
  currency?: string;
}

interface LiteRoomType {
  offerId?: string;
  roomName?: string;
  boardName?: string;
  suggestedSellingPrice?: LiteMoney;
  minimumSellingPrice?: LiteMoney;
  offerRetailRate?: LiteMoney;
  offerInitialPrice?: LiteMoney;
}

interface LiteRateHotel {
  hotelId?: string;
  hotel_id?: string;
  roomTypes?: LiteRoomType[];
}

interface LitePrebookRate {
  bookingId?: string;
}

const CITY_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  bangkok: { latitude: 13.7563, longitude: 100.5018 },
  tokyo: { latitude: 35.6762, longitude: 139.6503 },
  kyoto: { latitude: 35.0116, longitude: 135.7681 },
  osaka: { latitude: 34.6937, longitude: 135.5023 },
  seoul: { latitude: 37.5665, longitude: 126.978 },
  singapore: { latitude: 1.3521, longitude: 103.8198 },
};

export class LiteApiHotelProvider implements HotelProviderApi {
  readonly name = 'liteapi';
  private readonly base = 'https://api.liteapi.travel/v3.0';
  private readonly logger = new Logger(LiteApiHotelProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly fx: FxService,
  ) {}

  private get apiKey(): string {
    return this.config.get<string>('LITEAPI_KEY')!;
  }

  private headers(): Record<string, string> {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async searchHotels(p: HotelSearch): Promise<BookingOffer[]> {
    const nights = Math.max(1, p.nights ?? 1);
    const checkIn = p.check_in ?? new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    const checkOut = new Date(new Date(checkIn).getTime() + nights * 86_400_000).toISOString().slice(0, 10);
    const center = cityCenter(p.city);
    if (!center) return [];

    const catalog = await this.searchHotelCatalog({
      latitude: center.latitude,
      longitude: center.longitude,
      radiusM: 5000,
      limit: 20,
    });
    return this.searchHotelRates({
      hotelIds: catalog.map((h) => h.hotel_id),
      check_in: checkIn,
      check_out: checkOut,
      adults: 2,
    });
  }

  async searchHotelCatalog(q: HotelCatalogQuery): Promise<HotelPin[]> {
    const search = new URLSearchParams({
      latitude: String(q.latitude),
      longitude: String(q.longitude),
      radius: String(q.radiusM),
      limit: String(q.limit ?? 50),
    });
    const res = await fetch(`${this.base}/data/hotels?${search}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`LiteAPI hotel catalog failed: ${res.status}`);

    const json = (await res.json()) as { data?: LiteHotel[]; hotels?: LiteHotel[] };
    const hotels = json.data ?? json.hotels ?? [];
    return hotels.flatMap((hotel, index) => {
      const hotelId = hotel.id ?? hotel.hotelId;
      if (!hotelId || hotel.latitude == null || hotel.longitude == null) return [];
      return {
        hotel_id: hotelId,
        name: hotel.name ?? hotel.hotelName ?? `Stay ${index + 1}`,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        rating: hotel.rating ?? null,
        stars: hotel.stars ?? null,
        thumbnail: hotel.main_photo ?? hotel.thumbnail,
        address: hotel.address,
      };
    });
  }

  async searchHotelRates(q: HotelRatesQuery): Promise<BookingOffer[]> {
    if (q.hotelIds.length === 0) return [];
    const hotelIds = [...new Set(q.hotelIds)].slice(0, 100);
    const res = await fetch(`${this.base}/hotels/rates`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        hotelIds,
        checkin: q.check_in,
        checkout: q.check_out,
        occupancies: [{ adults: q.adults ?? 2 }],
        currency: 'USD',
        guestNationality: 'US',
        margin: 0,
      }),
    });
    if (!res.ok) throw new Error(`LiteAPI hotel rates failed: ${res.status}`);

    const json = (await res.json()) as { data?: LiteRateHotel[]; hotels?: LiteRateHotel[] };
    const hotels = json.data ?? json.hotels ?? [];
    const usdThb = await this.fx.usdToThb();

    return hotels.flatMap((hotel) => {
      const hotelId = hotel.hotelId ?? hotel.hotel_id;
      if (!hotelId) return [];
      const offers = (hotel.roomTypes ?? [])
        .flatMap((room) => this.toOffer(hotelId, room, q, usdThb))
        .sort((a, b) => a.amount_thb - b.amount_thb);
      return offers[0] ? [offers[0]] : [];
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
    const prebook = (await prebookRes.json()) as { data?: LitePrebookRate; bookingId?: string };
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

  private toOffer(hotelId: string, room: LiteRoomType, q: HotelRatesQuery, usdThb: number): BookingOffer[] {
    const offerId = room.offerId;
    const net = firstNumber(room.offerRetailRate?.amount);
    const ssp = firstNumber(room.suggestedSellingPrice?.amount, room.minimumSellingPrice?.amount);
    const currency = (room.offerRetailRate?.currency ?? room.suggestedSellingPrice?.currency ?? 'USD').toUpperCase();
    if (!offerId || net == null) return [];

    const priced = computeHotelDisplayPrice({ net, ssp });
    if (priced.flags.length > 0) {
      this.logger.warn(`LiteAPI hotel ${hotelId} pricing flags: ${priced.flags.join(', ')}`);
    }
    if (priced.suppressed) return [];

    const nights = Math.max(1, Math.round((Date.parse(q.check_out) - Date.parse(q.check_in)) / 86_400_000));
    const amountThb = toThb(priced.displayPrice, currency, usdThb);
    return [{
      id: offerId,
      type: 'hotel',
      provider: 'liteapi',
      title: room.roomName ?? room.boardName ?? `Hotel ${hotelId}`,
      subtitle: `${nights} nights - ${room.boardName ?? 'stay'}`,
      amount_thb: Math.round(amountThb || 0),
      meta: {
        hotel_id: hotelId,
        check_in: q.check_in,
        check_out: q.check_out,
        nights,
        pricing: {
          net,
          ssp,
          retail_rate: firstNumber(room.offerInitialPrice?.amount),
          currency,
          basis: priced.basis,
          implied_markup: priced.impliedMarkup,
          flags: priced.flags,
          display_price: priced.displayPrice,
        },
        raw_rate: room,
      },
    }];
  }
}

function cityCenter(city?: string): { latitude: number; longitude: number } | null {
  const key = city?.trim().toLowerCase().split(',')[0] ?? '';
  return CITY_CENTERS[key] ?? null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function toThb(amount: number, currency: string, usdThb: number): number {
  return currency === 'THB' ? amount : amount * usdThb;
}

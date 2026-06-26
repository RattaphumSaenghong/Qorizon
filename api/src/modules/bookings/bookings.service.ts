import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Booking, Prisma } from '@prisma/client';
import type {
  BookingDetailRow,
  BookingOffer,
  BookingProvider,
  BookingRow,
  BookingStatus,
  BookingType,
} from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import {
  FLIGHT_PROVIDER,
  HOTEL_PROVIDER,
  type FlightProviderApi,
  type HotelPin,
  type HotelProviderApi,
} from './providers/booking-provider';
import { SearchBookingDto } from './dto/search-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { HotelCatalogQueryDto } from './dto/hotel-catalog-query.dto';
import { HotelRatesDto } from './dto/hotel-rates.dto';
import { extractFlightSummary, flightDepartsOutsideTripWindow, timeFromIso } from './flight-itinerary';

// Internal estimate of provider/affiliate payout. This is not user-facing markup.
const ESTIMATED_PROVIDER_COMMISSION_RATE = 0.08;

// In-memory price calendar cache: key → { expires, prices }
const priceCalendarCache = new Map<string, { expires: number; prices: Record<string, number> }>();
// One real cheapest-fare "anchor" per route, reused to estimate every month.
const flightAnchorCache = new Map<string, { expires: number; price: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

// Day-of-week price multipliers (Sun..Sat): weekends/Fri pricier, mid-week cheaper.
const DOW_FACTOR = [1.18, 1.0, 0.9, 0.88, 0.97, 1.15, 1.08];
// Seasonal multipliers per month (Jan..Dec): summer + year-end holidays peak.
const SEASON_FACTOR = [1.05, 0.92, 0.95, 1.05, 0.95, 1.0, 1.15, 1.15, 0.98, 0.97, 1.0, 1.2];

/** Deterministic 0..99 hash from a date string, for stable per-day jitter. */
function dayHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100;
  return h;
}

/** Build a full month of estimated lowest fares from a single anchor price. */
function estimateMonthPrices(anchor: number, year: number, month: number): Record<string, number> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const prices: Record<string, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dowFactor = DOW_FACTOR[date.getDay()];
    const seasonFactor = SEASON_FACTOR[month - 1];
    const mm = String(month).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const key = `${year}-${mm}-${dd}`;
    const jitter = 0.95 + dayHash(key) / 1000; // 0.95 .. 1.049
    prices[key] = Math.round((anchor * dowFactor * seasonFactor * jitter) / 10) * 10;
  }
  return prices;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    @Inject(FLIGHT_PROVIDER) private readonly flightProvider: FlightProviderApi,
    @Inject(HOTEL_PROVIDER) private readonly hotelProvider: HotelProviderApi,
  ) {}

  /** Search live offers via the active provider (no DB write). */
  async search(dto: SearchBookingDto): Promise<BookingOffer[]> {
    if (dto.type === 'flight') {
      return this.flightProvider.searchFlights({
        origin: dto.origin,
        destination: dto.destination,
        depart_date: dto.depart_date,
        return_date: dto.return_date,
      });
    }
    return this.hotelProvider.searchHotels({ city: dto.city, check_in: dto.check_in, nights: dto.nights });
  }

  async hotelCatalog(query: HotelCatalogQueryDto): Promise<HotelPin[]> {
    const latitude = Number(query.lat);
    const longitude = Number(query.lng);
    const radiusM = Math.min(20_000, Math.max(250, Math.round(Number(query.radius))));
    const limit = Math.min(100, Math.max(1, Math.round(Number(query.limit ?? 50))));
    return this.hotelProvider.searchHotelCatalog({ latitude, longitude, radiusM, limit });
  }

  async hotelRates(dto: HotelRatesDto): Promise<BookingOffer[]> {
    return this.hotelProvider.searchHotelRates({
      hotelIds: dto.hotelIds,
      check_in: dto.check_in,
      check_out: dto.check_out,
      adults: dto.adults ?? 2,
    });
  }

  /** Book an offer (status 'pending'). If a trip + assignees are given, also
   *  creates an assigned logistics block in the itinerary and links it. */
  async create(userId: string, dto: CreateBookingDto): Promise<BookingRow> {
    if (dto.trip_id) await this.policy.assertCanReadTrip(userId, dto.trip_id);
    const flightSummary = dto.type === 'flight' ? extractFlightSummary(dto.meta ?? null) : null;
    if (dto.trip_id && dto.type === 'flight') {
      const trip = await this.prisma.trip.findUnique({
        where: { id: dto.trip_id },
        select: { start_date: true, end_date: true },
      });
      if (trip && flightDepartsOutsideTripWindow(trip, flightSummary?.dep_at)) {
        throw new BadRequestException('flight departure is outside this trip date range');
      }
    }

    const commission = Math.round(dto.amount_thb * ESTIMATED_PROVIDER_COMMISSION_RATE);
    const assigneeIds = dto.assignee_ids ?? [];
    const scope = dto.trip_id && assigneeIds.length > 0 ? 'assigned' : 'shared';
    const confirmation =
      dto.external_ref && dto.type === 'flight' && dto.passenger_details
        ? await this.flightProvider.bookFlight(dto.external_ref, dto.passenger_details)
        : dto.external_ref && dto.type === 'hotel' && dto.guest_details
          ? await this.hotelProvider.bookHotel(dto.external_ref, dto.guest_details)
          : null;
    const externalRef = confirmation?.external_ref ?? null;
    const status = confirmation?.status ?? 'pending';

    const booking = await this.prisma.$transaction(async (tx) => {
      let stopId: string | null = null;

      if (dto.trip_id) {
        // Create the itinerary logistics block
        const stop = await tx.stop.create({
          data: {
            trip_id: dto.trip_id,
            user_id: userId,
            category: dto.type === 'flight' ? 'flight' : 'hotel',
            location_name: dto.title ?? null,
            status: 'planned',
            scope,
            cost: dto.amount_thb ? Math.round(dto.amount_thb) : undefined,
            planned_start: dto.type === 'flight' ? timeFromIso(flightSummary?.dep_at) ?? undefined : undefined,
            planned_end: dto.type === 'flight' ? timeFromIso(flightSummary?.arr_at) ?? undefined : undefined,
            meta: flightSummary ? (flightSummary as unknown as Prisma.InputJsonValue) : undefined,
            ...(scope === 'assigned' && assigneeIds.length > 0
              ? { assignees: { create: assigneeIds.map((uid) => ({ user_id: uid })) } }
              : {}),
          },
        });
        stopId = stop.id;
      }

      return tx.booking.create({
        data: {
          user_id: userId,
          trip_id: dto.trip_id ?? null,
          stop_id: stopId,
          type: dto.type,
          provider: dto.provider,
          external_ref: externalRef,
          status,
          amount_thb: dto.amount_thb,
          commission_thb: commission,
          raw_payload: {
            title: dto.title ?? null,
            meta: dto.meta ?? null,
            confirmation: confirmation?.raw ?? null,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return toBookingRow(booking);
  }

  /** A single real cheapest-fare lookup per route, cached 30 min. Used as the
   *  anchor for the estimated price calendar so we don't hammer the provider. */
  private async flightAnchorPrice(origin: string, destination: string): Promise<number | null> {
    const key = `${origin}-${destination}`;
    const cached = flightAnchorCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.price;

    const refDate = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
    try {
      const offers = await this.flightProvider.searchFlights({ origin, destination, depart_date: refDate });
      if (offers.length === 0) return null;
      const price = Math.min(...offers.map((o) => o.amount_thb));
      flightAnchorCache.set(key, { expires: Date.now() + CACHE_TTL_MS, price });
      return price;
    } catch {
      return null;
    }
  }

  /** Estimated cheapest fare per day for the given month. Duffel has no fare-
   *  calendar API, so we take ONE real cheapest fare as an anchor and model
   *  per-day variation (day-of-week + season). Estimates, not live quotes.
   *  Cached in-memory for 30 minutes per route+month. */
  async priceCalendar(origin: string, destination: string, year: number, month: number): Promise<Record<string, number>> {
    const cacheKey = `${origin}-${destination}-${year}-${month}`;
    const cached = priceCalendarCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.prices;

    const anchor = await this.flightAnchorPrice(origin, destination);
    if (anchor == null) return {};

    const prices = estimateMonthPrices(anchor, year, month);
    priceCalendarCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, prices });
    return prices;
  }

  /** The user's bookings (optionally for one trip). */
  async list(userId: string, tripId?: string): Promise<BookingRow[]> {
    const rows = await this.prisma.booking.findMany({
      where: { user_id: userId, ...(tripId ? { trip_id: tripId } : {}) },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(toBookingRow);
  }

  async getOne(userId: string, id: string): Promise<BookingDetailRow> {
    const booking = await this.prisma.booking.findFirst({ where: { id, user_id: userId } });
    if (!booking) throw new NotFoundException('booking not found');
    return toBookingDetailRow(booking);
  }

  confirm(userId: string, id: string): Promise<BookingRow> {
    return this.setStatus(userId, id, 'confirmed');
  }
  cancel(userId: string, id: string): Promise<BookingRow> {
    return this.setStatus(userId, id, 'cancelled');
  }

  private async setStatus(userId: string, id: string, status: BookingStatus): Promise<BookingRow> {
    const res = await this.prisma.booking.updateMany({
      where: { id, user_id: userId },
      data: { status },
    });
    if (res.count === 0) throw new NotFoundException('booking not found');
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id } });
    return toBookingRow(booking);
  }
}

function toBookingRow(b: Booking): BookingRow {
  const raw = (b.raw_payload as { title?: string | null } | null) ?? {};
  return {
    id: b.id,
    user_id: b.user_id,
    trip_id: b.trip_id,
    type: b.type as BookingType,
    provider: b.provider as BookingProvider,
    external_ref: b.external_ref,
    status: b.status as BookingStatus,
    amount_thb: b.amount_thb === null ? null : Number(b.amount_thb),
    commission_thb: b.commission_thb === null ? null : Number(b.commission_thb),
    title: raw.title ?? null,
    created_at: b.created_at.toISOString(),
  };
}

function toBookingDetailRow(b: Booking): BookingDetailRow {
  const raw = (b.raw_payload as {
    title?: string | null;
    meta?: Record<string, unknown> | null;
    confirmation?: Record<string, unknown> | null;
  } | null) ?? {};

  return {
    ...toBookingRow(b),
    stop_id: b.stop_id,
    meta: raw.meta ?? null,
    confirmation: raw.confirmation ?? null,
  };
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Booking, Prisma } from '@prisma/client';
import type {
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
  type HotelProviderApi,
} from './providers/booking-provider';
import { SearchBookingDto } from './dto/search-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

// Internal estimate of provider/affiliate payout. This is not user-facing markup.
const ESTIMATED_PROVIDER_COMMISSION_RATE = 0.08;

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
      });
    }
    return this.hotelProvider.searchHotels({ city: dto.city, check_in: dto.check_in, nights: dto.nights });
  }

  /** Book an offer (status 'pending'). If a trip + assignees are given, also
   *  creates an assigned logistics block in the itinerary and links it. */
  async create(userId: string, dto: CreateBookingDto): Promise<BookingRow> {
    if (dto.trip_id) await this.policy.assertCanReadTrip(userId, dto.trip_id);

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

  /** The user's bookings (optionally for one trip). */
  async list(userId: string, tripId?: string): Promise<BookingRow[]> {
    const rows = await this.prisma.booking.findMany({
      where: { user_id: userId, ...(tripId ? { trip_id: tripId } : {}) },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(toBookingRow);
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

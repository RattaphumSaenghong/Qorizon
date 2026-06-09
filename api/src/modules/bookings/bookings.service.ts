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
import { BOOKING_PROVIDER, type BookingProviderApi } from './providers/booking-provider';
import { SearchBookingDto } from './dto/search-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

const COMMISSION_RATE = 0.08; // Trailr's cut

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    @Inject(BOOKING_PROVIDER) private readonly provider: BookingProviderApi,
  ) {}

  /** Search live offers via the active provider (no DB write). */
  async search(dto: SearchBookingDto): Promise<BookingOffer[]> {
    if (dto.type === 'flight') {
      return this.provider.searchFlights({
        origin: dto.origin,
        destination: dto.destination,
        depart_date: dto.depart_date,
      });
    }
    return this.provider.searchHotels({ city: dto.city, check_in: dto.check_in, nights: dto.nights });
  }

  /** Book an offer (status 'pending'). Records the commission. */
  async create(userId: string, dto: CreateBookingDto): Promise<BookingRow> {
    if (dto.trip_id) await this.policy.assertCanReadTrip(userId, dto.trip_id);

    const commission = Math.round(dto.amount_thb * COMMISSION_RATE);
    const booking = await this.prisma.booking.create({
      data: {
        user_id: userId,
        trip_id: dto.trip_id ?? null,
        type: dto.type,
        provider: dto.provider,
        external_ref: dto.external_ref,
        status: 'pending',
        amount_thb: dto.amount_thb,
        commission_thb: commission,
        raw_payload: { title: dto.title ?? null, meta: dto.meta ?? null } as Prisma.InputJsonValue,
      },
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

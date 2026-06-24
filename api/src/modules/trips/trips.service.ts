import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Stop } from '@prisma/client';
import type { ForkMode, TripDayRow, TripRow, TripWithAuthor } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateTripDayDto } from './dto/update-trip-day.dto';
import { toTripDayRow, toTripRow, toTripWithAuthor } from './trip.mapper';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

const SKIM_EXCLUDED = ['hotel', 'flight', 'transport'];
const MAX_PREFILLED_DAYS = 60;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async getById(userId: string | null, tripId: string): Promise<TripWithAuthor> {
    await this.policy.assertCanReadTrip(userId, tripId);
    const trip = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      include: { author: { select: AUTHOR_SELECT } },
    });
    return toTripWithAuthor(trip);
  }

  /**
   * Trips for a profile. Owner sees all; others see public/followers only.
   * Archived trips are hidden by default; only the owner may include them.
   */
  async getUserTrips(
    viewerId: string | null,
    targetId: string,
    includeArchived = false,
  ): Promise<TripWithAuthor[]> {
    const isOwner = viewerId === targetId;
    const where: Prisma.TripWhereInput = isOwner
      ? { user_id: targetId }
      : { user_id: targetId, visibility: { in: ['public', 'followers'] } };

    // Only the owner can opt into seeing archived trips; everyone else never does.
    if (!isOwner || !includeArchived) {
      where.status = { not: 'archived' };
    }

    const trips = await this.prisma.trip.findMany({
      where,
      include: { author: { select: AUTHOR_SELECT } },
      orderBy: { created_at: 'desc' },
    });
    return trips.map(toTripWithAuthor);
  }

  /** Home feed: trips from people the user follows. */
  async getFollowingFeed(userId: string, limit = 20): Promise<TripWithAuthor[]> {
    const follows = await this.prisma.follow.findMany({
      where: { follower_id: userId },
      select: { following_id: true },
    });
    const followingIds = follows.map((f) => f.following_id);
    if (followingIds.length === 0) return [];

    const trips = await this.prisma.trip.findMany({
      where: { user_id: { in: followingIds }, visibility: { in: ['public', 'followers'] } },
      include: { author: { select: AUTHOR_SELECT } },
      orderBy: { updated_at: 'desc' },
      take: limit,
    });
    return trips.map(toTripWithAuthor);
  }

  async getDays(userId: string | null, tripId: string): Promise<TripDayRow[]> {
    await this.policy.assertCanReadTrip(userId, tripId);
    const days = await this.prisma.tripDay.findMany({
      where: { trip_id: tripId },
      orderBy: { day_number: 'asc' },
    });
    return days.map(toTripDayRow);
  }

  async addDay(userId: string, tripId: string): Promise<TripDayRow> {
    await this.policy.assertOwnsTrip(userId, tripId);
    const last = await this.prisma.tripDay.findFirst({
      where: { trip_id: tripId },
      orderBy: { day_number: 'desc' },
    });
    const nextNumber = (last?.day_number ?? 0) + 1;
    const day = await this.prisma.tripDay.create({
      data: { trip_id: tripId, day_number: nextNumber },
    });
    return toTripDayRow(day);
  }

  /** Edit a day's label/date (owner only). Pass null to clear a field. */
  async updateDay(
    userId: string,
    tripId: string,
    dayId: string,
    dto: UpdateTripDayDto,
  ): Promise<TripDayRow> {
    await this.policy.assertOwnsTrip(userId, tripId);
    const existing = await this.prisma.tripDay.findFirst({
      where: { id: dayId, trip_id: tripId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('day not found');
    const day = await this.prisma.tripDay.update({
      where: { id: dayId },
      data: {
        ...(dto.place !== undefined ? { place: dto.place } : {}),
        ...(dto.date !== undefined ? { date: dto.date ? new Date(dto.date) : null } : {}),
      },
    });
    return toTripDayRow(day);
  }

  async create(userId: string, dto: CreateTripDto): Promise<TripRow> {
    // Trips are planned forward: a new trip can't start before today. (Seeding
    // bypasses this — it writes via PrismaClient directly, not this service.)
    // Scoped to create() only, so forking/editing trips with past dates still work.
    if (dto.backdated) {
      assertNotFuture(dto.end_date ?? dto.start_date);
    } else {
      assertNotPast(dto.start_date);
    }

    const prefilledDates = buildPrefilledDates(dto.start_date, dto.end_date);

    const trip = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          user_id: userId,
          title: dto.title,
          description: dto.description,
          cover_image_url: dto.cover_image_url,
          status: dto.status,
          stage: dto.stage,
          transport_mode: dto.transport_mode,
          destination: dto.destination,
          budget: dto.budget,
          budget_currency: dto.budget_currency,
          live_mode: dto.live_mode,
          live_cadence: dto.live_cadence,
          visibility: dto.visibility,
          start_date: dto.start_date ? new Date(dto.start_date) : undefined,
          end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        },
      });

      if (prefilledDates.length > 0) {
        await tx.tripDay.createMany({
          data: prefilledDates.map((date, index) => ({
            trip_id: created.id,
            day_number: index + 1,
            date,
          })),
        });
      }

      return created;
    });
    return toTripRow(trip);
  }

  async removeDay(userId: string, tripId: string, dayId: string): Promise<void> {
    await this.policy.assertOwnsTrip(userId, tripId);

    await this.prisma.$transaction(async (tx) => {
      const day = await tx.tripDay.findFirst({
        where: { id: dayId, trip_id: tripId },
        select: { id: true },
      });
      if (!day) throw new NotFoundException('day not found');

      await tx.tripDay.delete({ where: { id: dayId } });

      const remaining = await tx.tripDay.findMany({
        where: { trip_id: tripId },
        orderBy: [{ day_number: 'asc' }, { date: 'asc' }, { id: 'asc' }],
        select: { id: true, day_number: true },
      });
      // Renumber sequentially in ascending order. The (trip_id, day_number) unique
      // constraint makes this order-sensitive: each day must move into the slot
      // vacated just below it, so a parallel Promise.all could hit a transient
      // collision. Skip no-op updates to avoid needless writes.
      for (const [index, d] of remaining.entries()) {
        const next = index + 1;
        if (d.day_number === next) continue;
        await tx.tripDay.update({
          where: { id: d.id },
          data: { day_number: next },
        });
      }
    });
  }

  async update(userId: string, tripId: string, dto: UpdateTripDto): Promise<TripRow> {
    await this.policy.assertOwnsTrip(userId, tripId);
    const trip = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        title: dto.title,
        description: dto.description,
        cover_image_url: dto.cover_image_url,
        status: dto.status,
        transport_mode: dto.transport_mode,
        destination: dto.destination,
        budget: dto.budget, // null clears, undefined leaves unchanged
        budget_currency: dto.budget_currency,
        live_mode: dto.live_mode,
        live_cadence: dto.live_cadence,
        visibility: dto.visibility,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      },
    });
    return toTripRow(trip);
  }

  /** Permanently delete a trip and everything under it (owner only). */
  async remove(userId: string, tripId: string): Promise<void> {
    await this.policy.assertOwnsTrip(userId, tripId);
    // FK relations declare onDelete: Cascade, so the DB removes days, stops,
    // media, members, messages, bookings, etc. when the trip row is deleted.
    await this.prisma.trip.delete({ where: { id: tripId } });
  }

  /**
   * Fork a trip — port of the fork_trip() SQL function.
   * Deep-copies the PLAN (trip shell + days + stops reset to 'planned',
   * story data stripped), bumps source fork_count, all in one transaction.
   * skim → drops logistics (hotel/flight/transport) and any day left empty.
   */
  async fork(userId: string, sourceTripId: string, mode: ForkMode): Promise<TripRow> {
    await this.policy.assertCanReadTrip(userId, sourceTripId);
    const catFilter: Prisma.StopWhereInput =
      mode === 'skim' ? { category: { notIn: SKIM_EXCLUDED } } : {};

    return this.prisma.$transaction(async (tx) => {
      const src = await tx.trip.findUniqueOrThrow({ where: { id: sourceTripId } });

      const newTrip = await tx.trip.create({
        data: {
          user_id: userId,
          title: src.title,
          description: src.description,
          cover_image_url: src.cover_image_url,
          status: 'draft',
          live_mode: false,
          live_cadence: src.live_cadence,
          transport_mode: src.transport_mode,
          visibility: 'private',
          forked_from_id: src.id,
          start_date: src.start_date,
          end_date: src.end_date,
        },
      });

      const days = await tx.tripDay.findMany({
        where: { trip_id: sourceTripId },
        orderBy: { day_number: 'asc' },
      });

      for (const day of days) {
        const stops = await tx.stop.findMany({
          where: { day_id: day.id, ...catFilter },
          orderBy: { sort_order: 'asc' },
        });
        if (mode === 'skim' && stops.length === 0) continue; // drop empty day

        const newDay = await tx.tripDay.create({
          data: { trip_id: newTrip.id, day_number: day.day_number, place: day.place, date: day.date },
        });
        if (stops.length) {
          await tx.stop.createMany({
            data: stops.map((s) => planStop(s, newTrip.id, newDay.id, userId)),
          });
        }
      }

      // loose stops not attached to any day
      const loose = await tx.stop.findMany({
        where: { trip_id: sourceTripId, day_id: null, ...catFilter },
        orderBy: { sort_order: 'asc' },
      });
      if (loose.length) {
        await tx.stop.createMany({
          data: loose.map((s) => planStop(s, newTrip.id, null, userId)),
        });
      }

      await tx.trip.update({
        where: { id: sourceTripId },
        data: { fork_count: { increment: 1 } },
      });

      return toTripRow(newTrip);
    });
  }
}

function buildPrefilledDates(start?: string, end?: string): Date[] {
  if (!start || !end) return [];

  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (endDate.getTime() < startDate.getTime()) {
    throw new BadRequestException('end_date must be on or after start_date');
  }

  const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (dayCount > MAX_PREFILLED_DAYS) {
    throw new BadRequestException(`Trip date range cannot exceed ${MAX_PREFILLED_DAYS} days`);
  }

  return Array.from({ length: dayCount }, (_, index) => addUtcDays(startDate, index));
}

/** Midnight today in UTC, as epoch ms. Date-only comparisons are lenient near TZ midnight. */
function todayUtcMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** Reject a start date earlier than today (planning is forward-only). */
function assertNotPast(start?: string): void {
  if (!start) return;
  if (parseDateOnly(start).getTime() < todayUtcMs()) {
    throw new BadRequestException("Trip can't start in the past");
  }
}

/** Reject an end date later than today (a logged trip already happened). */
function assertNotFuture(end?: string): void {
  if (!end) return;
  if (parseDateOnly(end).getTime() > todayUtcMs()) {
    throw new BadRequestException("Logged trips can't end in the future");
  }
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) throw new BadRequestException('Invalid trip date');
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Copy a stop's PLAN fields only, reset to 'planned' (story data stripped). */
function planStop(
  s: Stop,
  tripId: string,
  dayId: string | null,
  userId: string,
): Prisma.StopCreateManyInput {
  return {
    trip_id: tripId,
    day_id: dayId,
    user_id: userId,
    status: 'planned',
    category: s.category,
    location_name: s.location_name,
    latitude: s.latitude,
    longitude: s.longitude,
    place_id: s.place_id,
    planned_start: s.planned_start,
    planned_end: s.planned_end,
    duration_mins: s.duration_mins,
    sort_order: s.sort_order,
    notes: s.notes,
  };
}

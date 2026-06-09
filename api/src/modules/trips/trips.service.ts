import { Injectable } from '@nestjs/common';
import type { Prisma, Stop } from '@prisma/client';
import type { ForkMode, TripDayRow, TripRow, TripWithAuthor } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { toTripDayRow, toTripRow, toTripWithAuthor } from './trip.mapper';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

const SKIM_EXCLUDED = ['hotel', 'flight', 'transport'];

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

  /** Trips for a profile. Owner sees all; others see public/followers only. */
  async getUserTrips(viewerId: string | null, targetId: string): Promise<TripWithAuthor[]> {
    const where: Prisma.TripWhereInput =
      viewerId === targetId
        ? { user_id: targetId }
        : { user_id: targetId, visibility: { in: ['public', 'followers'] } };

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

  async create(userId: string, dto: CreateTripDto): Promise<TripRow> {
    const trip = await this.prisma.trip.create({
      data: {
        user_id: userId,
        title: dto.title,
        description: dto.description,
        cover_image_url: dto.cover_image_url,
        status: dto.status,
        stage: dto.stage,
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
    return toTripRow(trip);
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
        live_mode: dto.live_mode,
        live_cadence: dto.live_cadence,
        visibility: dto.visibility,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      },
    });
    return toTripRow(trip);
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
    planned_time: s.planned_time,
    duration_mins: s.duration_mins,
    sort_order: s.sort_order,
    notes: s.notes,
  };
}

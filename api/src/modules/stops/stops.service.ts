import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { FeedStop, StopRow, StopStatus, StopWithMedia } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { toStopRow, toStopWithMedia } from './stop.mapper';
import { computeFeedEligible } from './feed-eligibility';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

const FEED_INCLUDE = {
  media: { orderBy: { sort_order: 'asc' } },
  author: { select: AUTHOR_SELECT },
  trip: { select: { id: true, title: true, cover_image_url: true } },
} as const;

@Injectable()
export class StopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async getTripStops(
    userId: string | null,
    tripId: string,
    status?: StopStatus,
  ): Promise<StopWithMedia[]> {
    await this.policy.assertCanReadTrip(userId, tripId);
    const stops = await this.prisma.stop.findMany({
      where: { trip_id: tripId, ...(status ? { status } : {}) },
      include: { media: { orderBy: { sort_order: 'asc' } }, author: { select: AUTHOR_SELECT } },
      orderBy: { sort_order: 'asc' },
    });
    return stops.map(toStopWithMedia);
  }

  /** A user's posts (their visited stops) for their profile grid. Owner sees all;
   *  others see only posts on public/followers trips. Not feed-gated — it's their record. */
  async getUserPosts(viewerId: string | null, targetId: string): Promise<StopWithMedia[]> {
    const where: Prisma.StopWhereInput =
      viewerId === targetId
        ? { user_id: targetId, status: 'visited' }
        : { user_id: targetId, status: 'visited', trip: { visibility: { in: ['public', 'followers'] } } };

    const stops = await this.prisma.stop.findMany({
      where,
      include: { media: { orderBy: { sort_order: 'asc' } }, author: { select: AUTHOR_SELECT } },
      orderBy: { captured_at: 'desc' },
    });
    return stops.map(toStopWithMedia);
  }

  /** Home feed: recent visited stops from people the user follows. */
  async getFeedStops(userId: string, limit = 30): Promise<FeedStop[]> {
    const follows = await this.prisma.follow.findMany({
      where: { follower_id: userId },
      select: { following_id: true },
    });
    const followingIds = follows.map((f) => f.following_id);
    if (followingIds.length === 0) return [];

    const stops = await this.prisma.stop.findMany({
      where: { status: 'visited', feed_eligible: true, user_id: { in: followingIds } },
      include: FEED_INCLUDE,
      orderBy: { captured_at: 'desc' },
      take: limit,
    });
    return this.attachFlags(userId, stops);
  }

  /** Public discover feed: recent visited stops from public trips (logged-out home). */
  async getDiscoverStops(userId: string | null, limit = 30): Promise<FeedStop[]> {
    const stops = await this.prisma.stop.findMany({
      where: { status: 'visited', feed_eligible: true, trip: { visibility: 'public' } },
      include: FEED_INCLUDE,
      orderBy: { captured_at: 'desc' },
      take: limit,
    });
    return this.attachFlags(userId, stops);
  }

  /** Map feed rows to FeedStop, adding the viewer's like/save state (none if anon). */
  private async attachFlags(
    userId: string | null,
    stops: Array<Parameters<typeof toStopWithMedia>[0] & { trip: FeedStop['trip'] }>,
  ): Promise<FeedStop[]> {
    let likedSet = new Set<string>();
    let savedSet = new Set<string>();
    if (userId) {
      const stopIds = stops.map((s) => s.id);
      const [likes, saved] = await Promise.all([
        this.prisma.like.findMany({
          where: { user_id: userId, stop_id: { in: stopIds } },
          select: { stop_id: true },
        }),
        this.prisma.savedItem.findMany({
          where: { user_id: userId, stop_id: { in: stopIds } },
          select: { stop_id: true },
        }),
      ]);
      likedSet = new Set(likes.map((l) => l.stop_id));
      savedSet = new Set(
        saved.map((s) => s.stop_id).filter((id): id is string => id !== null),
      );
    }
    return stops.map((s) => ({
      ...toStopWithMedia(s),
      trip: s.trip,
      is_liked: likedSet.has(s.id),
      is_saved: savedSet.has(s.id),
    }));
  }

  async create(userId: string, dto: CreateStopDto): Promise<StopRow> {
    await this.policy.assertOwnsTrip(userId, dto.trip_id);
    const { captured_at, ...rest } = dto;
    const stop = await this.prisma.stop.create({
      data: {
        ...rest,
        user_id: userId,
        captured_at: captured_at ? new Date(captured_at) : undefined,
      },
    });
    const feed_eligible = await this.recomputeFeedEligibility(stop.id);
    return toStopRow({ ...stop, feed_eligible });
  }

  async update(userId: string, stopId: string, dto: UpdateStopDto): Promise<StopRow> {
    const tripId = await this.stopTripId(stopId);
    await this.policy.assertOwnsTrip(userId, tripId);
    const { captured_at, ...rest } = dto;
    const stop = await this.prisma.stop.update({
      where: { id: stopId },
      data: {
        ...rest,
        captured_at: captured_at ? new Date(captured_at) : undefined,
      },
    });
    const feed_eligible = await this.recomputeFeedEligibility(stop.id);
    return toStopRow({ ...stop, feed_eligible });
  }

  /**
   * Recompute eligibility for ALL visited stops of a trip. Called by the live
   * module after trail points arrive — a stop posted before its trail point
   * existed can now pass (or fail) the 1km check.
   */
  async recomputeTripFeedEligibility(tripId: string): Promise<void> {
    const visited = await this.prisma.stop.findMany({
      where: { trip_id: tripId, status: 'visited' },
      select: { id: true },
    });
    for (const s of visited) {
      await this.recomputeFeedEligibility(s.id);
    }
  }

  /**
   * Recompute & persist whether a stop may appear in the feed (temporal window
   * + within 1km of the trail, or business account). Returns the new value.
   * Called whenever a stop is created/edited or when trail points are added.
   */
  private async recomputeFeedEligibility(stopId: string): Promise<boolean> {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      select: { status: true, latitude: true, longitude: true, trip_id: true, user_id: true },
    });
    if (!stop) return false;

    const [trip, author, trail] = await Promise.all([
      this.prisma.trip.findUnique({
        where: { id: stop.trip_id },
        select: { start_date: true, end_date: true, live_mode: true },
      }),
      this.prisma.user.findUnique({
        where: { id: stop.user_id },
        select: { account_type: true },
      }),
      this.prisma.trailPoint.findMany({
        where: { trip_id: stop.trip_id },
        select: { latitude: true, longitude: true },
      }),
    ]);

    const eligible = computeFeedEligible({
      status: stop.status,
      latitude: stop.latitude,
      longitude: stop.longitude,
      startDate: trip?.start_date ?? null,
      endDate: trip?.end_date ?? null,
      liveMode: trip?.live_mode ?? false,
      accountType: author?.account_type ?? 'personal',
      trail,
      now: new Date(),
    });

    await this.prisma.stop.update({ where: { id: stopId }, data: { feed_eligible: eligible } });
    return eligible;
  }

  async remove(userId: string, stopId: string): Promise<void> {
    const tripId = await this.stopTripId(stopId);
    await this.policy.assertOwnsTrip(userId, tripId);
    await this.prisma.stop.delete({ where: { id: stopId } });
  }

  /** Toggle like; keeps stops.like_count in step within one transaction. */
  async toggleLike(userId: string, stopId: string): Promise<boolean> {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      select: { trip_id: true },
    });
    if (!stop) throw new NotFoundException('stop not found');
    await this.policy.assertCanReadTrip(userId, stop.trip_id);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { user_id_stop_id: { user_id: userId, stop_id: stopId } },
      });
      if (existing) {
        await tx.like.delete({ where: { user_id_stop_id: { user_id: userId, stop_id: stopId } } });
        await tx.stop.update({ where: { id: stopId }, data: { like_count: { decrement: 1 } } });
        return false;
      }
      await tx.like.create({ data: { user_id: userId, stop_id: stopId } });
      await tx.stop.update({ where: { id: stopId }, data: { like_count: { increment: 1 } } });
      return true;
    });
  }

  /** Resolve a stop's trip_id (404 if missing). Ownership asserted by caller. */
  private async stopTripId(stopId: string): Promise<string> {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      select: { trip_id: true },
    });
    if (!stop) throw new NotFoundException('stop not found');
    return stop.trip_id;
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Authorization — the in-code port of the old Postgres RLS helpers
 * (`can_read_trip`, `owns_trip`). Every trip/stop read or write goes
 * through these instead of relying on the database.
 */
@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /** A trip is readable by: its owner; anyone if public/link_only;
   *  followers if visibility = 'followers'. 'private' → owner only. */
  async canReadTrip(userId: string | null, tripId: string): Promise<boolean> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { user_id: true, visibility: true },
    });
    if (!trip) return false;
    if (userId && trip.user_id === userId) return true;
    if (trip.visibility === 'public' || trip.visibility === 'link_only') return true;
    if (trip.visibility === 'followers' && userId) {
      return this.isFollowing(userId, trip.user_id);
    }
    return false;
  }

  async ownsTrip(userId: string, tripId: string): Promise<boolean> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { user_id: true },
    });
    return !!trip && trip.user_id === userId;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const row = await this.prisma.follow.findUnique({
      where: { follower_id_following_id: { follower_id: followerId, following_id: followingId } },
    });
    return !!row;
  }

  // ── assert helpers (throw the right HTTP error) ───────────────────────

  /** 404 if the trip isn't visible to this user (don't leak existence). */
  async assertCanReadTrip(userId: string | null, tripId: string): Promise<void> {
    if (!(await this.canReadTrip(userId, tripId))) {
      throw new NotFoundException('trip not found');
    }
  }

  /** 404 if missing, 403 if not the owner. */
  async assertOwnsTrip(userId: string, tripId: string): Promise<void> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { user_id: true },
    });
    if (!trip) throw new NotFoundException('trip not found');
    if (trip.user_id !== userId) throw new ForbiddenException('not your trip');
  }
}

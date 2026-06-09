import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { PublicUser } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(viewerId: string | null, id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user not found');
    return toPublicUser(user, await this.canSeePhone(viewerId, user.id));
  }

  async getByUsername(viewerId: string | null, username: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('user not found');
    return toPublicUser(user, await this.canSeePhone(viewerId, user.id));
  }

  async updateProfile(currentUserId: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: currentUserId },
      data: dto,
    });
    return toPublicUser(user, true); // your own phone is yours to see
  }

  /** Users that `id` follows (for the trip-invite picker). */
  async getFollowing(id: string): Promise<PublicUser[]> {
    const rows = await this.prisma.follow.findMany({
      where: { follower_id: id },
      include: { following: true },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => toPublicUser(r.following, false));
  }

  /** Phone is visible to yourself and to people you share a trip with. */
  private async canSeePhone(viewerId: string | null, targetId: string): Promise<boolean> {
    if (!viewerId) return false;
    if (viewerId === targetId) return true;
    const [owned, accepted] = await Promise.all([
      this.prisma.trip.findMany({
        where: { user_id: { in: [viewerId, targetId] } },
        select: { id: true, user_id: true },
      }),
      this.prisma.tripMember.findMany({
        where: { user_id: { in: [viewerId, targetId] }, status: 'accepted' },
        select: { trip_id: true, user_id: true },
      }),
    ]);
    const viewerTrips = new Set<string>();
    const targetTrips = new Set<string>();
    for (const t of owned) (t.user_id === viewerId ? viewerTrips : targetTrips).add(t.id);
    for (const m of accepted) (m.user_id === viewerId ? viewerTrips : targetTrips).add(m.trip_id);
    for (const id of viewerTrips) if (targetTrips.has(id)) return true;
    return false;
  }

  /** Follow target. Bumps both counters in the same transaction. Idempotent. */
  async follow(followerId: string, targetId: string): Promise<void> {
    if (followerId === targetId) throw new BadRequestException('cannot follow yourself');

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: { follower_id_following_id: { follower_id: followerId, following_id: targetId } },
      });
      if (existing) return; // already following → no double count

      const target = await tx.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!target) throw new NotFoundException('user not found');

      await tx.follow.create({ data: { follower_id: followerId, following_id: targetId } });
      await tx.user.update({ where: { id: followerId }, data: { following_count: { increment: 1 } } });
      await tx.user.update({ where: { id: targetId }, data: { follower_count: { increment: 1 } } });
    });
  }

  /** Unfollow target. Reverses both counters in the same transaction. Idempotent. */
  async unfollow(followerId: string, targetId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: { follower_id_following_id: { follower_id: followerId, following_id: targetId } },
      });
      if (!existing) return; // not following → nothing to undo

      await tx.follow.delete({
        where: { follower_id_following_id: { follower_id: followerId, following_id: targetId } },
      });
      await tx.user.update({ where: { id: followerId }, data: { following_count: { decrement: 1 } } });
      await tx.user.update({ where: { id: targetId }, data: { follower_count: { decrement: 1 } } });
    });
  }

  async isFollowing(followerId: string, targetId: string): Promise<boolean> {
    const row = await this.prisma.follow.findUnique({
      where: { follower_id_following_id: { follower_id: followerId, following_id: targetId } },
    });
    return !!row;
  }
}

function toPublicUser(user: User, includePhone: boolean): PublicUser {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    bio: user.bio,
    real_name: user.real_name,
    phone: includePhone ? user.phone : null,
    language: user.language as PublicUser['language'],
    follower_count: user.follower_count,
    following_count: user.following_count,
    created_at: user.created_at.toISOString(),
  };
}

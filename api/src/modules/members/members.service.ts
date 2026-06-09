import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { TripInviteItem, TripMemberItem } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  /** Owner invites a user → pending member + a notification. */
  async invite(ownerId: string, tripId: string, targetUserId: string): Promise<TripMemberItem> {
    await this.policy.assertOwnsTrip(ownerId, tripId);
    if (targetUserId === ownerId) throw new BadRequestException('you already own this trip');
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) throw new NotFoundException('user not found');

    const member = await this.prisma.tripMember.upsert({
      where: { trip_id_user_id: { trip_id: tripId, user_id: targetUserId } },
      update: { status: 'pending', invited_by: ownerId, responded_at: null },
      create: { trip_id: tripId, user_id: targetUserId, role: 'editor', status: 'pending', invited_by: ownerId },
      include: { user: true },
    });
    await this.prisma.notification.create({
      data: { user_id: targetUserId, type: 'trip_invite', actor_id: ownerId, trip_id: tripId },
    });
    return toMemberItem(member);
  }

  /** Everyone on the trip (owner can read; visibility enforced by policy). */
  async list(viewerId: string | null, tripId: string): Promise<TripMemberItem[]> {
    await this.policy.assertCanReadTrip(viewerId, tripId);
    const members = await this.prisma.tripMember.findMany({
      where: { trip_id: tripId },
      include: { user: true },
      orderBy: { created_at: 'asc' },
    });
    return members.map(toMemberItem);
  }

  /** The invited user accepts or declines. */
  async respond(userId: string, tripId: string, status: 'accepted' | 'declined'): Promise<TripMemberItem> {
    const member = await this.prisma.tripMember.findUnique({
      where: { trip_id_user_id: { trip_id: tripId, user_id: userId } },
    });
    if (!member) throw new NotFoundException('no invite for this trip');
    const updated = await this.prisma.tripMember.update({
      where: { id: member.id },
      data: { status, responded_at: new Date() },
      include: { user: true },
    });
    return toMemberItem(updated);
  }

  /** Owner removes a member, or a member leaves. */
  async remove(actorId: string, tripId: string, targetUserId: string): Promise<void> {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { user_id: true } });
    if (!trip) throw new NotFoundException('trip not found');
    if (trip.user_id !== actorId && actorId !== targetUserId) {
      throw new ForbiddenException('cannot remove this member');
    }
    await this.prisma.tripMember.deleteMany({ where: { trip_id: tripId, user_id: targetUserId } });
  }

  /** The current user's pending trip invites. */
  async myInvites(userId: string): Promise<TripInviteItem[]> {
    const rows = await this.prisma.tripMember.findMany({
      where: { user_id: userId, status: 'pending' },
      include: { trip: { include: { author: { select: AUTHOR_SELECT } } } },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((m) => ({
      id: m.id,
      trip_id: m.trip_id,
      status: m.status as TripInviteItem['status'],
      trip: {
        id: m.trip.id,
        title: m.trip.title,
        destination: m.trip.destination,
        cover_image_url: m.trip.cover_image_url,
      },
      inviter: m.trip.author
        ? {
            id: m.trip.author.id,
            username: m.trip.author.username,
            display_name: m.trip.author.display_name,
            avatar_url: m.trip.author.avatar_url,
          }
        : null,
    }));
  }
}

function toMemberItem(m: {
  id: string;
  trip_id: string;
  user_id: string;
  role: string;
  status: string;
  user: { id: string; username: string; display_name: string | null; avatar_url: string | null; real_name: string | null };
}): TripMemberItem {
  return {
    id: m.id,
    trip_id: m.trip_id,
    user_id: m.user_id,
    role: m.role,
    status: m.status as TripMemberItem['status'],
    user: {
      id: m.user.id,
      username: m.user.username,
      display_name: m.user.display_name,
      avatar_url: m.user.avatar_url,
      real_name: m.user.real_name,
    },
  };
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { TripMessage, User } from '@prisma/client';
import type { TripMessageItem } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  /** Chat is collaborator-only (owner or accepted member). `after` returns only
   *  newer messages — the client polls with the latest timestamp it has. */
  async list(userId: string, tripId: string, after?: string): Promise<TripMessageItem[]> {
    await this.policy.assertCanEditTrip(userId, tripId);
    const rows = await this.prisma.tripMessage.findMany({
      where: {
        trip_id: tripId,
        ...(after ? { created_at: { gt: new Date(after) } } : {}),
      },
      include: { user: { select: AUTHOR_SELECT } },
      orderBy: { created_at: 'asc' },
    });
    return rows.map(toMessageItem);
  }

  async create(userId: string, tripId: string, body: string): Promise<TripMessageItem> {
    await this.policy.assertCanEditTrip(userId, tripId);
    const msg = await this.prisma.tripMessage.create({
      data: { trip_id: tripId, user_id: userId, body },
      include: { user: { select: AUTHOR_SELECT } },
    });
    void this.notifyCollaborators(tripId, userId);
    return toMessageItem(msg);
  }

  private async notifyCollaborators(tripId: string, senderId: string): Promise<void> {
    const [trip, members] = await Promise.all([
      this.prisma.trip.findUnique({ where: { id: tripId }, select: { user_id: true } }),
      this.prisma.tripMember.findMany({
        where: { trip_id: tripId, status: 'accepted' },
        select: { user_id: true },
      }),
    ]);
    if (!trip) return;
    const recipients = [...new Set([trip.user_id, ...members.map((m) => m.user_id)])].filter(
      (id) => id !== senderId,
    );
    for (const userId of recipients) {
      const bumped = await this.prisma.notification.updateMany({
        where: { user_id: userId, trip_id: tripId, type: 'trip_message', read: false },
        data: { actor_id: senderId, created_at: new Date() },
      });
      if (bumped.count === 0) {
        await this.prisma.notification.create({
          data: { user_id: userId, type: 'trip_message', actor_id: senderId, trip_id: tripId },
        });
      }
    }
  }

  /** Delete your own message. */
  async remove(userId: string, messageId: string): Promise<void> {
    const msg = await this.prisma.tripMessage.findUnique({
      where: { id: messageId },
      select: { user_id: true },
    });
    if (!msg) throw new NotFoundException('message not found');
    if (msg.user_id !== userId) throw new ForbiddenException('not your message');
    await this.prisma.tripMessage.delete({ where: { id: messageId } });
  }
}

function toMessageItem(
  m: TripMessage & { user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> },
): TripMessageItem {
  return {
    id: m.id,
    trip_id: m.trip_id,
    body: m.body,
    created_at: m.created_at.toISOString(),
    author: {
      id: m.user.id,
      username: m.user.username,
      display_name: m.user.display_name,
      avatar_url: m.user.avatar_url,
    },
  };
}

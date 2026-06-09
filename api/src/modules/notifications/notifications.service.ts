import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationItem } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';

const ACTOR_SELECT = { id: true, username: true, display_name: true, avatar_url: true } as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The current user's notifications, newest first. */
  async list(userId: string, limit = 50): Promise<NotificationItem[]> {
    const rows = await this.prisma.notification.findMany({
      where: { user_id: userId },
      include: {
        actor: { select: ACTOR_SELECT },
        trip: { select: { id: true, title: true } },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return rows.map((n) => ({
      id: n.id,
      type: n.type as NotificationItem['type'],
      read: n.read,
      created_at: n.created_at.toISOString(),
      actor: n.actor
        ? {
            id: n.actor.id,
            username: n.actor.username,
            display_name: n.actor.display_name,
            avatar_url: n.actor.avatar_url,
          }
        : null,
      trip: n.trip ? { id: n.trip.id, title: n.trip.title } : null,
      stop_id: n.stop_id,
      batch_id: n.batch_id,
    }));
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { user_id: userId, read: false } });
  }

  /** Mark one notification read. 404 if it isn't the caller's. */
  async markRead(userId: string, id: string): Promise<void> {
    const res = await this.prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { read: true },
    });
    if (res.count === 0) throw new NotFoundException('notification not found');
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true },
    });
    return { updated: res.count };
  }
}

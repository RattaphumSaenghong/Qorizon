import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Comment, User } from '@prisma/client';
import type { CommentItem } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async list(userId: string | null, stopId: string): Promise<CommentItem[]> {
    await this.assertCanReadStop(userId, stopId);
    const rows = await this.prisma.comment.findMany({
      where: { stop_id: stopId },
      include: { user: { select: AUTHOR_SELECT } },
      orderBy: { created_at: 'asc' },
    });
    return rows.map(toCommentItem);
  }

  /** Add a comment; bumps stops.comment_count in the same transaction. */
  async create(userId: string, stopId: string, content: string): Promise<CommentItem> {
    await this.assertCanReadStop(userId, stopId);

    const comment = await this.prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({ data: { user_id: userId, stop_id: stopId, content } });
      await tx.stop.update({ where: { id: stopId }, data: { comment_count: { increment: 1 } } });
      return c;
    });

    const full = await this.prisma.comment.findUniqueOrThrow({
      where: { id: comment.id },
      include: { user: { select: AUTHOR_SELECT } },
    });
    return toCommentItem(full);
  }

  /** Delete own comment; decrements the counter in the same transaction. */
  async remove(userId: string, commentId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { user_id: true, stop_id: true },
    });
    if (!comment) throw new NotFoundException('comment not found');
    if (comment.user_id !== userId) throw new ForbiddenException('not your comment');

    await this.prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: commentId } });
      await tx.stop.update({ where: { id: comment.stop_id }, data: { comment_count: { decrement: 1 } } });
    });
  }

  /** A comment is readable iff its stop's trip is readable. */
  private async assertCanReadStop(userId: string | null, stopId: string): Promise<void> {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      select: { trip_id: true },
    });
    if (!stop) throw new NotFoundException('stop not found');
    await this.policy.assertCanReadTrip(userId, stop.trip_id);
  }
}

function toCommentItem(c: Comment & { user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> }): CommentItem {
  return {
    id: c.id,
    stop_id: c.stop_id,
    content: c.content,
    created_at: c.created_at.toISOString(),
    author: {
      id: c.user.id,
      username: c.user.username,
      display_name: c.user.display_name,
      avatar_url: c.user.avatar_url,
    },
  };
}

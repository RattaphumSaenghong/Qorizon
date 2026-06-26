import { Injectable } from '@nestjs/common';
import type { UserSearchResult, TripSearchResult, SearchResults } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

// ILIKE %q% is a sequential scan at this scale — fine for seed data.
// Upgrade path: pg_trgm GIN index on (username, display_name, real_name, title, destination).

function prefixScore(value: string | null, q: string): number {
  if (!value) return 0;
  return value.toLowerCase().startsWith(q.toLowerCase()) ? 1 : 0;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  // viewerId is unused here but kept for signature parity with trips()/all().
  async users(_viewerId: string | null, q: string, limit = 20): Promise<UserSearchResult[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { display_name: { contains: q, mode: 'insensitive' } },
          { real_name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { ...AUTHOR_SELECT, follower_count: true },
      take: limit * 2, // over-fetch so ranking can sort down
    });

    return rows
      .sort((a, b) => {
        const pa = prefixScore(a.username, q);
        const pb = prefixScore(b.username, q);
        if (pb !== pa) return pb - pa;
        return b.follower_count - a.follower_count;
      })
      .slice(0, limit)
      .map((u) => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        follower_count: u.follower_count,
      }));
  }

  async trips(viewerId: string | null, q: string, limit = 20): Promise<TripSearchResult[]> {
    const followingIds = viewerId
      ? (
          await this.prisma.follow.findMany({
            where: { follower_id: viewerId },
            select: { following_id: true },
          })
        ).map((f) => f.following_id)
      : [];

    const visibilityOr: { visibility?: string; user_id?: string | { in: string[] } }[] = [
      { visibility: 'public' },
      { visibility: 'link_only' },
      ...(viewerId ? [{ user_id: viewerId }] : []),
      ...(followingIds.length > 0
        ? followingIds.map((id) => ({ visibility: 'followers', user_id: id }))
        : []),
    ];

    const rows = await this.prisma.trip.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { destination: { contains: q, mode: 'insensitive' } },
            ],
          },
          { OR: visibilityOr },
        ],
      },
      select: {
        id: true,
        title: true,
        destination: true,
        cover_image_url: true,
        stage: true,
        fork_count: true,
        author: { select: AUTHOR_SELECT },
      },
      take: limit * 2,
    });

    return rows
      .sort((a, b) => {
        const pa = prefixScore(a.title, q);
        const pb = prefixScore(b.title, q);
        if (pb !== pa) return pb - pa;
        return b.fork_count - a.fork_count;
      })
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        cover_image_url: t.cover_image_url,
        stage: t.stage as TripSearchResult['stage'],
        author: {
          id: t.author.id,
          username: t.author.username,
          display_name: t.author.display_name,
          avatar_url: t.author.avatar_url,
        },
      }));
  }

  async all(viewerId: string | null, q: string, limit = 5): Promise<SearchResults> {
    const [users, trips] = await Promise.all([
      this.users(viewerId, q, limit),
      this.trips(viewerId, q, limit),
    ]);
    return { users, trips };
  }
}

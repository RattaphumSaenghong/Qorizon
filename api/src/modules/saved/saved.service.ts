import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SavedItem } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toStopWithMedia } from '../stops/stop.mapper';
import { toTripWithAuthor } from '../trips/trip.mapper';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

const INCLUDE = {
  stop: { include: { media: { orderBy: { sort_order: 'asc' } }, author: { select: AUTHOR_SELECT } } },
  trip: { include: { author: { select: AUTHOR_SELECT } } },
} as const;

@Injectable()
export class SavedService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<SavedItem[]> {
    const rows = await this.prisma.savedItem.findMany({
      where: { user_id: userId },
      include: INCLUDE,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at.toISOString(),
      stop: r.stop ? toStopWithMedia(r.stop) : null,
      trip: r.trip ? toTripWithAuthor(r.trip) : null,
    }));
  }

  /** Bookmark a stop or trip. Exactly one. Idempotent. */
  async save(userId: string, dto: { stop_id?: string; trip_id?: string }): Promise<SavedItem> {
    if (!!dto.stop_id === !!dto.trip_id) {
      throw new BadRequestException('provide exactly one of stop_id or trip_id');
    }

    const existing = await this.prisma.savedItem.findFirst({
      where: { user_id: userId, stop_id: dto.stop_id ?? null, trip_id: dto.trip_id ?? null },
    });
    const row =
      existing ??
      (await this.prisma.savedItem.create({
        data: { user_id: userId, stop_id: dto.stop_id ?? null, trip_id: dto.trip_id ?? null },
      }));

    const full = await this.prisma.savedItem.findUniqueOrThrow({ where: { id: row.id }, include: INCLUDE });
    return {
      id: full.id,
      created_at: full.created_at.toISOString(),
      stop: full.stop ? toStopWithMedia(full.stop) : null,
      trip: full.trip ? toTripWithAuthor(full.trip) : null,
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.prisma.savedItem.deleteMany({ where: { id, user_id: userId } });
    if (res.count === 0) throw new NotFoundException('saved item not found');
  }

  /** Toggle a bookmark by target (for the feed/journal bookmark button). */
  async toggle(userId: string, dto: { stop_id?: string; trip_id?: string }): Promise<{ saved: boolean }> {
    if (!!dto.stop_id === !!dto.trip_id) {
      throw new BadRequestException('provide exactly one of stop_id or trip_id');
    }
    const existing = await this.prisma.savedItem.findFirst({
      where: { user_id: userId, stop_id: dto.stop_id ?? null, trip_id: dto.trip_id ?? null },
    });
    if (existing) {
      await this.prisma.savedItem.delete({ where: { id: existing.id } });
      return { saved: false };
    }
    await this.prisma.savedItem.create({
      data: { user_id: userId, stop_id: dto.stop_id ?? null, trip_id: dto.trip_id ?? null },
    });
    return { saved: true };
  }
}

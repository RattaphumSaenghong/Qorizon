import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Album, AlbumItem, AlbumOverrides } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AUTHOR_SELECT } from '../../common/prisma-selects';

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  /** Assemble the album: a trip's visited media, with overrides applied. */
  async getAlbum(userId: string | null, tripId: string, includeExcluded = false): Promise<Album> {
    await this.policy.assertCanReadTrip(userId, tripId);

    const trip = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      include: { author: { select: AUTHOR_SELECT } },
    });
    // Excluded media are only ever returned to the owner's edit mode.
    const showExcluded = includeExcluded && userId === trip.user_id;
    // Auto-album is chronological by capture time (fall back to plan order).
    const stops = await this.prisma.stop.findMany({
      where: { trip_id: tripId, status: 'visited' },
      include: { media: { orderBy: { sort_order: 'asc' } } },
      orderBy: [{ captured_at: 'asc' }, { sort_order: 'asc' }],
    });

    const overrides = (trip.album_overrides as AlbumOverrides | null) ?? {};
    const excluded = new Set(overrides.excluded ?? []);
    const captions = overrides.captions ?? {};

    // Flatten media across visited stops, in stop → media order.
    let items: AlbumItem[] = stops.flatMap((stop) =>
      stop.media
        .filter((m) => showExcluded || !excluded.has(m.id))
        .map((m) => ({
          media_id: m.id,
          stop_id: stop.id,
          type: m.type as AlbumItem['type'],
          url: m.url,
          cdn_url: m.cdn_url,
          // Media often lack their own GPS — fall back to the owning stop's location.
          latitude: m.latitude ?? stop.latitude,
          longitude: m.longitude ?? stop.longitude,
          captured_at: m.captured_at ? m.captured_at.toISOString() : null,
          location_name: stop.location_name,
          caption: captions[m.id] ?? stop.caption,
          excluded: excluded.has(m.id),
        })),
    );

    items = applyOrder(items, overrides.order);

    return {
      trip: {
        id: trip.id,
        title: trip.title,
        cover_image_url: trip.cover_image_url,
        user_id: trip.user_id,
      },
      author: {
        id: trip.author.id,
        username: trip.author.username,
        display_name: trip.author.display_name,
        avatar_url: trip.author.avatar_url,
      },
      items,
      count: items.filter((i) => !i.excluded).length,
    };
  }

  /** Edit the album overrides (reorder / exclude / caption). Owner only. */
  async updateOverrides(userId: string, tripId: string, dto: UpdateAlbumDto): Promise<Album> {
    await this.policy.assertOwnsTrip(userId, tripId);

    const trip = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      select: { album_overrides: true },
    });
    const current = (trip.album_overrides as AlbumOverrides | null) ?? {};

    // order / excluded are full-replace (client sends the whole list).
    // captions deep-merge per media id; an empty/blank value reverts to the stop caption.
    let captions = current.captions;
    if (dto.captions !== undefined) {
      captions = { ...current.captions, ...dto.captions };
      for (const key of Object.keys(captions)) {
        if (!captions[key]?.trim()) delete captions[key];
      }
    }

    const merged: AlbumOverrides = {
      ...current,
      ...(dto.order !== undefined ? { order: dto.order } : {}),
      ...(dto.excluded !== undefined ? { excluded: dto.excluded } : {}),
      ...(captions !== undefined ? { captions } : {}),
    };

    await this.prisma.trip.update({
      where: { id: tripId },
      data: { album_overrides: merged as Prisma.InputJsonValue },
    });

    // Owner edits: return the full set (excluded flagged) so edit mode stays in sync.
    return this.getAlbum(userId, tripId, true);
  }
}

/** Re-sequence items by the override order; unlisted items keep their position after. */
function applyOrder(items: AlbumItem[], order?: string[]): AlbumItem[] {
  if (!order || order.length === 0) return items;
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(a.media_id) ? rank.get(a.media_id)! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.media_id) ? rank.get(b.media_id)! : Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}

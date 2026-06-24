import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Album, AlbumItem, AlbumOverrides, Author } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AUTHOR_SELECT } from '../../common/prisma-selects';
import { toAuthor } from '../trips/trip.mapper';

interface AlbumOpts {
  member?: string | null; // whose album — defaults to the trip owner's
  includeExcluded?: boolean;
}

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  /**
   * Assemble a member's personal album: the trip's visited media authored by
   * that member, with that member's overrides applied. Defaults to the owner's
   * album (the canonical/public view) when no member is given.
   */
  async getAlbum(viewerId: string | null, tripId: string, opts: AlbumOpts = {}): Promise<Album> {
    await this.policy.assertCanReadTrip(viewerId, tripId);

    const trip = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      select: { id: true, title: true, cover_image_url: true, user_id: true },
    });
    const target = opts.member ?? trip.user_id;

    // Only the member viewing their OWN album sees excluded media (edit mode).
    const showExcluded = !!opts.includeExcluded && viewerId === target;

    // Auto-album is chronological by capture time (fall back to plan order).
    const stops = await this.prisma.stop.findMany({
      where: { trip_id: tripId, status: 'visited' },
      include: { media: { where: { user_id: target }, orderBy: { sort_order: 'asc' } } },
      orderBy: [{ captured_at: 'asc' }, { sort_order: 'asc' }],
    });

    const [overrideRow, includedMedia] = await Promise.all([
      this.prisma.albumOverride.findUnique({
        where: { trip_id_user_id: { trip_id: tripId, user_id: target } },
        select: { data: true },
      }),
      // Pull in pool media from other members that this member has included
      this.prisma.media.findMany({
        where: { trip_id: tripId, NOT: { user_id: target }, visibility: 'shared' },
        include: { stop: { select: { location_name: true, latitude: true, longitude: true, caption: true } } },
        orderBy: { created_at: 'asc' },
      }),
    ]);

    const overrides = (overrideRow?.data as AlbumOverrides | null) ?? {};
    const excluded = new Set(overrides.excluded ?? []);
    const includedIds = new Set(overrides.included ?? []);
    const captions = overrides.captions ?? {};

    // Flatten the target's media across visited stops, in stop → media order.
    let items: AlbumItem[] = stops.flatMap((stop) =>
      stop.media
        .filter((m) => showExcluded || !excluded.has(m.id))
        .map((m) => ({
          media_id: m.id,
          stop_id: stop.id,
          type: m.type as AlbumItem['type'],
          url: m.url,
          cdn_url: m.cdn_url,
          latitude: m.latitude ?? stop.latitude,
          longitude: m.longitude ?? stop.longitude,
          captured_at: m.captured_at ? m.captured_at.toISOString() : null,
          location_name: stop.location_name,
          caption: captions[m.id] ?? stop.caption,
          excluded: excluded.has(m.id),
        })),
    );

    // Union in pool photos from other members that were explicitly pulled in
    const pulledIn: AlbumItem[] = includedMedia
      .filter((m) => includedIds.has(m.id) && !excluded.has(m.id))
      .map((m) => ({
        media_id: m.id,
        stop_id: m.stop_id,
        type: m.type as AlbumItem['type'],
        url: m.url,
        cdn_url: m.cdn_url,
        latitude: m.latitude ?? m.stop?.latitude ?? null,
        longitude: m.longitude ?? m.stop?.longitude ?? null,
        captured_at: m.captured_at ? m.captured_at.toISOString() : null,
        location_name: m.stop?.location_name ?? null,
        caption: captions[m.id] ?? m.stop?.caption ?? null,
        excluded: false,
      }));

    items = [...items, ...pulledIn];

    items = applyOrder(items, overrides.order);

    // The album's "author" is the member whose album this is.
    const member = await this.prisma.user.findUniqueOrThrow({
      where: { id: target },
      select: AUTHOR_SELECT,
    });

    return {
      trip: {
        id: trip.id,
        title: trip.title,
        cover_image_url: trip.cover_image_url,
        user_id: trip.user_id,
      },
      author: toAuthor(member),
      items,
      count: items.filter((i) => !i.excluded).length,
    };
  }

  /** Everyone with memory on this trip (visited-media authors ∪ trail recorders),
   *  owner first — drives the album/journal member switcher. */
  async getContributors(viewerId: string | null, tripId: string): Promise<Author[]> {
    await this.policy.assertCanReadTrip(viewerId, tripId);
    const trip = await this.prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      select: { user_id: true },
    });
    const [media, trail] = await Promise.all([
      this.prisma.media.findMany({
        where: { stop: { trip_id: tripId, status: 'visited' } },
        select: { user_id: true },
        distinct: ['user_id'],
      }),
      this.prisma.trailPoint.findMany({
        where: { trip_id: tripId },
        select: { user_id: true },
        distinct: ['user_id'],
      }),
    ]);
    const ids = [...new Set([...media.map((m) => m.user_id), ...trail.map((t) => t.user_id)])];
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: AUTHOR_SELECT,
    });
    users.sort((a, b) => Number(b.id === trip.user_id) - Number(a.id === trip.user_id));
    return users.map(toAuthor);
  }

  /** Edit the current member's own album overrides (reorder / exclude / caption). */
  async updateOverrides(userId: string, tripId: string, dto: UpdateAlbumDto): Promise<Album> {
    await this.policy.assertCanEditTrip(userId, tripId);

    const existing = await this.prisma.albumOverride.findUnique({
      where: { trip_id_user_id: { trip_id: tripId, user_id: userId } },
      select: { data: true },
    });
    const current = (existing?.data as AlbumOverrides | null) ?? {};

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
      ...(dto.included !== undefined ? { included: dto.included } : {}),
      ...(captions !== undefined ? { captions } : {}),
    };

    await this.prisma.albumOverride.upsert({
      where: { trip_id_user_id: { trip_id: tripId, user_id: userId } },
      create: { trip_id: tripId, user_id: userId, data: merged as Prisma.InputJsonValue },
      update: { data: merged as Prisma.InputJsonValue },
    });

    // Return the editor's own full album (excluded flagged) so edit mode stays in sync.
    return this.getAlbum(userId, tripId, { member: userId, includeExcluded: true });
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

import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MediaRow, PoolItem } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { STORAGE, type StorageService } from '../../storage/storage.service';
import { toMediaRow } from '../stops/stop.mapper';
import { UploadMediaDto } from './dto/upload-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    @Inject(STORAGE) private readonly storage: StorageService,
  ) {}

  /** Upload to a specific stop (owner or member). */
  async upload(userId: string, stopId: string, dto: UploadMediaDto): Promise<MediaRow> {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      select: { trip_id: true },
    });
    if (!stop) throw new NotFoundException('stop not found');
    await this.policy.assertCanEditTrip(userId, stop.trip_id);
    return this.storeMedia(userId, stop.trip_id, dto, stopId);
  }

  /** Upload directly to the trip pool (no stop required). */
  async uploadToPool(userId: string, tripId: string, dto: UploadMediaDto): Promise<MediaRow> {
    await this.policy.assertCanEditTrip(userId, tripId);
    return this.storeMedia(userId, tripId, dto, dto.stop_id ?? null);
  }

  /** List the trip's shared pool (+ the viewer's own private photos). */
  async getPool(viewerId: string | null, tripId: string): Promise<PoolItem[]> {
    await this.policy.assertCanReadTrip(viewerId, tripId);
    const rows = await this.prisma.media.findMany({
      where: {
        trip_id: tripId,
        OR: [
          { visibility: 'shared' },
          { user_id: viewerId ?? '' },
        ],
      },
      include: { stop: { select: { location_name: true } } },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((m) => ({
      ...toMediaRow(m),
      location_name: m.stop?.location_name ?? null,
    }));
  }

  /** Update visibility or stop assignment (uploader only). */
  async update(userId: string, mediaId: string, dto: UpdateMediaDto): Promise<MediaRow> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: { user_id: true },
    });
    if (!media) throw new NotFoundException('media not found');
    if (media.user_id !== userId) throw new ForbiddenException('not your media');

    const updated = await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.stop_id !== undefined ? { stop_id: dto.stop_id } : {}),
      },
    });
    return toMediaRow(updated);
  }

  /** Delete media (uploader only). */
  async remove(userId: string, mediaId: string): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: { user_id: true, url: true },
    });
    if (!media) throw new NotFoundException('media not found');
    if (media.user_id !== userId) throw new ForbiddenException('not your media');
    await this.storage.delete(media.url).catch(() => undefined);
    await this.prisma.media.delete({ where: { id: mediaId } });
  }

  private async storeMedia(
    userId: string,
    tripId: string,
    dto: UploadMediaDto,
    stopId: string | null,
  ): Promise<MediaRow> {
    const base64 = dto.content_base64.replace(/^data:[^;]+;base64,/, '');
    const body = Buffer.from(base64, 'base64');
    const mediaId = randomUUID();
    const ext = EXT[dto.content_type] ?? 'bin';
    const key = `trips/${tripId}/${mediaId}.${ext}`;
    await this.storage.put(key, body, dto.content_type);

    const sortOrder = await this.prisma.media.count({ where: { trip_id: tripId } });

    const media = await this.prisma.media.create({
      data: {
        id: mediaId,
        trip_id: tripId,
        stop_id: stopId,
        user_id: userId,
        type: dto.type,
        visibility: dto.visibility ?? 'shared',
        url: key,
        cdn_url: this.storage.publicUrl(key),
        latitude: dto.latitude,
        longitude: dto.longitude,
        captured_at: dto.captured_at ? new Date(dto.captured_at) : undefined,
        size_bytes: BigInt(body.length),
        sort_order: sortOrder,
      },
    });
    return toMediaRow(media);
  }
}

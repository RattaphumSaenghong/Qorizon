import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MediaRow } from '@trailr/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../authz/policy.service';
import { STORAGE, type StorageService } from '../../storage/storage.service';
import { toMediaRow } from '../stops/stop.mapper';
import { UploadMediaDto } from './dto/upload-media.dto';

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

  /** Upload media to a stop (owner only). Proxies bytes through the API to storage. */
  async upload(userId: string, stopId: string, dto: UploadMediaDto): Promise<MediaRow> {
    const stop = await this.prisma.stop.findUnique({
      where: { id: stopId },
      select: { trip_id: true },
    });
    if (!stop) throw new NotFoundException('stop not found');
    await this.policy.assertOwnsTrip(userId, stop.trip_id);

    const base64 = dto.content_base64.replace(/^data:[^;]+;base64,/, '');
    const body = Buffer.from(base64, 'base64');

    const mediaId = randomUUID();
    const ext = EXT[dto.content_type] ?? 'bin';
    const key = `stops/${stopId}/${mediaId}.${ext}`;
    await this.storage.put(key, body, dto.content_type);

    const sortOrder = await this.prisma.media.count({ where: { stop_id: stopId } });

    const media = await this.prisma.media.create({
      data: {
        id: mediaId,
        stop_id: stopId,
        user_id: userId,
        type: dto.type,
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

  /** Delete media (uploader only). Removes the stored object too. */
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
}

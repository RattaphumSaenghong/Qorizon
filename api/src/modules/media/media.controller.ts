import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { MediaRow, PoolItem } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /** Upload to a stop (backward-compat endpoint). */
  @Post('stops/:id/media')
  upload(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UploadMediaDto,
  ): Promise<MediaRow> {
    return this.media.upload(userId, id, dto);
  }

  /** Upload directly to the trip pool. */
  @Post('trips/:id/media')
  uploadToPool(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UploadMediaDto,
  ): Promise<MediaRow> {
    return this.media.uploadToPool(userId, id, dto);
  }

  /** List a trip's shared pool (+ uploader's own private photos). */
  @PublicRead()
  @Get('trips/:id/pool')
  getPool(
    @CurrentUser() viewerId: string | undefined,
    @Param('id') id: string,
  ): Promise<PoolItem[]> {
    return this.media.getPool(viewerId ?? null, id);
  }

  /** Update visibility or stop assignment (uploader only). */
  @Patch('media/:id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
  ): Promise<MediaRow> {
    return this.media.update(userId, id, dto);
  }

  @Delete('media/:id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    return this.media.remove(userId, id);
  }
}

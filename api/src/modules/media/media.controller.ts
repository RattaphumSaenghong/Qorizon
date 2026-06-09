import { Body, Controller, Delete, HttpCode, Param, Post } from '@nestjs/common';
import type { MediaRow } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { UploadMediaDto } from './dto/upload-media.dto';

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('stops/:id/media')
  upload(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UploadMediaDto,
  ): Promise<MediaRow> {
    return this.media.upload(userId, id, dto);
  }

  @Delete('media/:id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    return this.media.remove(userId, id);
  }
}

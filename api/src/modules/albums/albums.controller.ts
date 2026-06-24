import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { Album, Author } from '@trailr/shared';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AlbumsService } from './albums.service';
import { UpdateAlbumDto } from './dto/update-album.dto';

/** Album routes live under the trip — an album is a derived view of a trip. */
@Controller()
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @PublicRead()
  @Get('trips/:id/album')
  getAlbum(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
    @Query('member') member?: string,
    @Query('include_excluded') includeExcluded?: string,
  ): Promise<Album> {
    const withExcluded = includeExcluded === '1' || includeExcluded === 'true';
    return this.albums.getAlbum(userId ?? null, id, { member: member ?? null, includeExcluded: withExcluded });
  }

  /** Members with memory on this trip — for the album/journal switcher. */
  @PublicRead()
  @Get('trips/:id/contributors')
  getContributors(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
  ): Promise<Author[]> {
    return this.albums.getContributors(userId ?? null, id);
  }

  @Patch('trips/:id/album')
  updateAlbum(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAlbumDto,
  ): Promise<Album> {
    return this.albums.updateOverrides(userId, id, dto);
  }
}

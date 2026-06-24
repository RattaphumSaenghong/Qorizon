import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { LiveBatchRow, TrailPointRow, TripRow } from '@trailr/shared';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LiveService } from './live.service';
import { SetLiveModeDto } from './dto/set-live-mode.dto';
import { PostTrailDto } from './dto/post-trail.dto';
import { PublishBatchDto } from './dto/publish-batch.dto';

/** Live-trail routes live under the trip. */
@Controller()
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Patch('trips/:id/live-mode')
  setLiveMode(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: SetLiveModeDto,
  ): Promise<TripRow> {
    return this.live.setLiveMode(userId, id, dto);
  }

  @Post('trips/:id/trail')
  addTrail(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: PostTrailDto,
  ): Promise<{ inserted: number }> {
    return this.live.addTrail(userId, id, dto);
  }

  @PublicRead()
  @Get('trips/:id/trail')
  getTrail(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
    @Query('member') member?: string,
  ): Promise<TrailPointRow[]> {
    return this.live.getTrail(userId ?? null, id, member ?? null);
  }

  @Post('trips/:id/batches')
  publishBatch(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: PublishBatchDto,
  ): Promise<LiveBatchRow> {
    return this.live.publishBatch(userId, id, dto);
  }

  @PublicRead()
  @Get('trips/:id/batches')
  getBatches(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
  ): Promise<LiveBatchRow[]> {
    return this.live.getBatches(userId ?? null, id);
  }
}

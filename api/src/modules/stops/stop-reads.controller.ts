import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import type { FeedStop, StopStatus, StopWithMedia } from '@trailr/shared';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StopsService } from './stops.service';

/** Stop read routes that don't live under /stops. */
@Controller()
export class StopReadsController {
  constructor(private readonly stops: StopsService) {}

  // A trip's stops (public; honours trip visibility via PolicyService).
  @PublicRead()
  @Get('trips/:id/stops')
  tripStops(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
    @Query('status') status?: StopStatus,
  ): Promise<StopWithMedia[]> {
    return this.stops.getTripStops(userId ?? null, id, status);
  }

  // A user's posts (visited stops) for their profile grid.
  @PublicRead()
  @Get('users/:id/posts')
  userPosts(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
  ): Promise<StopWithMedia[]> {
    return this.stops.getUserPosts(userId ?? null, id);
  }

  // A user's visited + planned stops for their profile map.
  @PublicRead()
  @Get('users/:id/map-stops')
  userMapStops(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
  ): Promise<StopWithMedia[]> {
    return this.stops.getUserMapStops(userId ?? null, id);
  }

  // Home feed: visited stops from people you follow (auth required).
  @Get('feed/stops')
  feed(
    @CurrentUser() userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<FeedStop[]> {
    return this.stops.getFeedStops(userId, limit ?? 30);
  }

  // Public discover feed: visited stops from public trips (logged-out home).
  @PublicRead()
  @Get('feed/discover')
  discover(
    @CurrentUser() userId: string | undefined,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<FeedStop[]> {
    return this.stops.getDiscoverStops(userId ?? null, limit ?? 30);
  }
}

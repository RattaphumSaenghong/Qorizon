import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import type { TripWithAuthor } from '@trailr/shared';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TripsService } from './trips.service';

/** Cross-cutting trip read routes that don't live under /trips. */
@Controller()
export class TripFeedsController {
  constructor(private readonly trips: TripsService) {}

  // Home feed of trips from people you follow (auth required).
  @Get('feed/trips')
  feed(
    @CurrentUser() userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TripWithAuthor[]> {
    return this.trips.getFollowingFeed(userId, limit ?? 20);
  }

  // A user's trips for their profile (public; richer when authed as the owner).
  @PublicRead()
  @Get('users/:id/trips')
  userTrips(
    @CurrentUser() viewerId: string | undefined,
    @Param('id') id: string,
  ): Promise<TripWithAuthor[]> {
    return this.trips.getUserTrips(viewerId ?? null, id);
  }
}

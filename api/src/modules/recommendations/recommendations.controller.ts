import { Controller, Get, Param, Query } from '@nestjs/common';
import type { HotelRecommendationsResponse } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecommendationsService } from './recommendations.service';

@Controller('trips/:id')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get('hotel-recommendations')
  hotelRecommendations(
    @CurrentUser() userId: string,
    @Param('id') tripId: string,
    @Query('checkIn') checkIn?: string,
    @Query('checkOut') checkOut?: string,
    @Query('guests') guests?: string,
    @Query('nightlyCap') nightlyCap?: string,
  ): Promise<HotelRecommendationsResponse> {
    return this.recommendations.recommendHotels(userId, tripId, {
      checkIn,
      checkOut,
      guests: toNum(guests),
      nightlyCap: toNum(nightlyCap),
    });
  }
}

function toNum(v?: string): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

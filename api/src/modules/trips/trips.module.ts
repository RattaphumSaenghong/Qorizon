import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripFeedsController } from './trip-feeds.controller';
import { TripsService } from './trips.service';

@Module({
  controllers: [TripsController, TripFeedsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}

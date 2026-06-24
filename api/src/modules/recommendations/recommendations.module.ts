import { Module } from '@nestjs/common';
import { BookingProviderModule } from '../bookings/providers/booking-provider.module';
import { MapsModule } from '../maps/maps.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [BookingProviderModule, MapsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}

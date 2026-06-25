import { Module } from '@nestjs/common';
import { BookingProviderModule } from './providers/booking-provider.module';
import { BookingsController } from './bookings.controller';
import { HotelSearchController } from './hotel-search.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [BookingProviderModule],
  controllers: [BookingsController, HotelSearchController],
  providers: [BookingsService],
})
export class BookingsModule {}

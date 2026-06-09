import { Module } from '@nestjs/common';
import { BookingProviderModule } from './providers/booking-provider.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [BookingProviderModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BOOKING_PROVIDER } from './booking-provider';
import { MockBookingProvider } from './mock.provider';
import { AmadeusBookingProvider } from './amadeus.provider';

@Module({
  providers: [
    {
      provide: BOOKING_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const hasAmadeus = config.get('AMADEUS_CLIENT_ID') && config.get('AMADEUS_CLIENT_SECRET');
        return hasAmadeus ? new AmadeusBookingProvider(config) : new MockBookingProvider();
      },
    },
  ],
  exports: [BOOKING_PROVIDER],
})
export class BookingProviderModule {}

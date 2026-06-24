import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FLIGHT_PROVIDER, HOTEL_PROVIDER } from './booking-provider';
import { DuffelFlightProvider } from './duffel.provider';
import { LiteApiHotelProvider } from './liteapi.provider';
import { MockFlightProvider, MockHotelProvider } from './mock.provider';

@Module({
  providers: [
    {
      provide: FLIGHT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return config.get('DUFFEL_API_KEY') ? new DuffelFlightProvider(config) : new MockFlightProvider();
      },
    },
    {
      provide: HOTEL_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return config.get('LITEAPI_KEY') ? new LiteApiHotelProvider(config) : new MockHotelProvider();
      },
    },
  ],
  exports: [FLIGHT_PROVIDER, HOTEL_PROVIDER],
})
export class BookingProviderModule {}

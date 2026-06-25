import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FxModule } from '../../fx/fx.module';
import { FxService } from '../../fx/fx.service';
import { FLIGHT_PROVIDER, HOTEL_PROVIDER } from './booking-provider';
import { DuffelFlightProvider } from './duffel.provider';
import { LiteApiHotelProvider } from './liteapi.provider';
import { MockFlightProvider, MockHotelProvider } from './mock.provider';

@Module({
  imports: [FxModule],
  providers: [
    {
      provide: FLIGHT_PROVIDER,
      inject: [ConfigService, FxService],
      useFactory: (config: ConfigService, fx: FxService) => {
        return config.get('DUFFEL_API_KEY') ? new DuffelFlightProvider(config, fx) : new MockFlightProvider();
      },
    },
    {
      provide: HOTEL_PROVIDER,
      inject: [ConfigService, FxService],
      useFactory: (config: ConfigService, fx: FxService) => {
        return config.get('LITEAPI_KEY') ? new LiteApiHotelProvider(config, fx) : new MockHotelProvider();
      },
    },
  ],
  exports: [FLIGHT_PROVIDER, HOTEL_PROVIDER],
})
export class BookingProviderModule {}

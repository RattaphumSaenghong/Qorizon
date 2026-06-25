import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import type { BookingOffer } from '@trailr/shared';
import type { HotelPin } from './providers/booking-provider';
import { BookingsService } from './bookings.service';
import { HotelCatalogQueryDto } from './dto/hotel-catalog-query.dto';
import { HotelRatesDto } from './dto/hotel-rates.dto';

@Controller('hotels')
export class HotelSearchController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('catalog')
  catalog(@Query() query: HotelCatalogQueryDto): Promise<HotelPin[]> {
    return this.bookings.hotelCatalog(query);
  }

  @Post('rates')
  @HttpCode(200)
  rates(@Body() dto: HotelRatesDto): Promise<BookingOffer[]> {
    return this.bookings.hotelRates(dto);
  }
}

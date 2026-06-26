import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { BookingDetailRow, BookingOffer, BookingRow } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { BookingsService } from './bookings.service';
import { SearchBookingDto } from './dto/search-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('search')
  @Public()
  @HttpCode(200)
  search(@Body() dto: SearchBookingDto): Promise<BookingOffer[]> {
    return this.bookings.search(dto);
  }

  @Get('price-calendar')
  @Public()
  priceCalendar(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ): Promise<Record<string, number>> {
    return this.bookings.priceCalendar(origin, destination, year, month);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateBookingDto): Promise<BookingRow> {
    return this.bookings.create(userId, dto);
  }

  @Get()
  list(
    @CurrentUser() userId: string,
    @Query('trip_id') tripId?: string,
  ): Promise<BookingRow[]> {
    return this.bookings.list(userId, tripId);
  }

  // Keep future literal GET routes above this greedy id route.
  @Get(':id')
  getOne(@CurrentUser() userId: string, @Param('id') id: string): Promise<BookingDetailRow> {
    return this.bookings.getOne(userId, id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() userId: string, @Param('id') id: string): Promise<BookingRow> {
    return this.bookings.confirm(userId, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() userId: string, @Param('id') id: string): Promise<BookingRow> {
    return this.bookings.cancel(userId, id);
  }
}

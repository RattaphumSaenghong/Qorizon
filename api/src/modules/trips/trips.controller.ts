import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { TripDayRow, TripRow, TripWithAuthor } from '@trailr/shared';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateTripDayDto } from './dto/update-trip-day.dto';
import { ForkTripDto } from './dto/fork-trip.dto';

@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateTripDto): Promise<TripRow> {
    return this.trips.create(userId, dto);
  }

  @PublicRead()
  @Get(':id')
  getById(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
  ): Promise<TripWithAuthor> {
    return this.trips.getById(userId ?? null, id);
  }

  @PublicRead()
  @Get(':id/days')
  getDays(
    @CurrentUser() userId: string | undefined,
    @Param('id') id: string,
  ): Promise<TripDayRow[]> {
    return this.trips.getDays(userId ?? null, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ): Promise<TripRow> {
    return this.trips.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    return this.trips.remove(userId, id);
  }

  @Post(':id/days')
  addDay(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<TripDayRow> {
    return this.trips.addDay(userId, id);
  }

  @Patch(':id/days/:dayId')
  updateDay(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateTripDayDto,
  ): Promise<TripDayRow> {
    return this.trips.updateDay(userId, id, dayId, dto);
  }

  @Delete(':id/days/:dayId')
  @HttpCode(204)
  removeDay(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Param('dayId') dayId: string,
  ): Promise<void> {
    return this.trips.removeDay(userId, id, dayId);
  }

  @Post(':id/fork')
  fork(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: ForkTripDto,
  ): Promise<TripRow> {
    return this.trips.fork(userId, id, dto.mode);
  }
}

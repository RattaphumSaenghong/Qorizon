import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { TripDayRow, TripRow, TripWithAuthor } from '@trailr/shared';
import { PublicRead } from '../../common/decorators/public-read.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
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

  @Post(':id/fork')
  fork(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: ForkTripDto,
  ): Promise<TripRow> {
    return this.trips.fork(userId, id, dto.mode);
  }
}

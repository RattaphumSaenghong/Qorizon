import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { LikeStateResponse, StopRow, StopWithMedia } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StopsService } from './stops.service';
import { CreateStopDto } from './dto/create-stop.dto';
import { UpdateStopDto } from './dto/update-stop.dto';

@Controller('stops')
export class StopsController {
  constructor(private readonly stops: StopsService) {}

  @Get('liked')
  liked(@CurrentUser() userId: string): Promise<StopWithMedia[]> {
    return this.stops.getLikedStops(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateStopDto): Promise<StopRow> {
    return this.stops.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStopDto,
  ): Promise<StopRow> {
    return this.stops.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    return this.stops.remove(userId, id);
  }

  @Post(':id/like')
  async like(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<LikeStateResponse> {
    return { is_liked: await this.stops.toggleLike(userId, id) };
  }
}

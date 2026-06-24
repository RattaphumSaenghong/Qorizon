import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import type { TripMessageItem } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /** Collaborator-only trip chat. `after` (ISO) returns only newer messages (polling). */
  @Get('trips/:id/messages')
  list(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Query('after') after?: string,
  ): Promise<TripMessageItem[]> {
    return this.messages.list(userId, id, after);
  }

  @Post('trips/:id/messages')
  create(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ): Promise<TripMessageItem> {
    return this.messages.create(userId, id, dto.body);
  }

  @Delete('messages/:id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    return this.messages.remove(userId, id);
  }
}

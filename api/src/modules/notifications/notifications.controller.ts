import { Controller, Get, HttpCode, Param, Patch, Post, Query, ParseIntPipe } from '@nestjs/common';
import type { NotificationItem, UnreadCountResponse } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<NotificationItem[]> {
    return this.notifications.list(userId, limit ?? 50);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() userId: string): Promise<UnreadCountResponse> {
    return { unread: await this.notifications.unreadCount(userId) };
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser() userId: string): Promise<{ updated: number }> {
    return this.notifications.markAllRead(userId);
  }

  @Patch(':id/read')
  @HttpCode(204)
  markRead(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    return this.notifications.markRead(userId, id);
  }
}

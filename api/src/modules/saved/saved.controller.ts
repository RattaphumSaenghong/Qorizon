import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { SavedItem } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SavedService } from './saved.service';
import { SaveItemDto } from './dto/save-item.dto';

@Controller('saved')
export class SavedController {
  constructor(private readonly saved: SavedService) {}

  @Get()
  list(@CurrentUser() userId: string): Promise<SavedItem[]> {
    return this.saved.list(userId);
  }

  @Post()
  save(@CurrentUser() userId: string, @Body() dto: SaveItemDto): Promise<SavedItem> {
    return this.saved.save(userId, dto);
  }

  @Post('toggle')
  @HttpCode(200)
  toggle(@CurrentUser() userId: string, @Body() dto: SaveItemDto): Promise<{ saved: boolean }> {
    return this.saved.toggle(userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    return this.saved.remove(userId, id);
  }
}

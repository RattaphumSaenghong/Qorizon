import { Body, Controller, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';
import type { InventoryItemRow } from '@trailr/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MatchInventoryDto } from './dto/match-inventory.dto';
import { IngestionService } from './ingestion.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly ingestion: IngestionService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query('type') type?: string): Promise<InventoryItemRow[]> {
    return this.ingestion.list(userId, type);
  }

  @Patch(':id/match')
  match(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() dto: MatchInventoryDto,
  ): Promise<InventoryItemRow> {
    return this.ingestion.match(userId, id, dto.trip_id);
  }

  @Patch(':id/dismiss')
  @HttpCode(200)
  dismiss(@CurrentUser() userId: string, @Param('id') id: string): Promise<InventoryItemRow> {
    return this.ingestion.dismiss(userId, id);
  }
}

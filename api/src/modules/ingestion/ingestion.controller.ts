import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { InventoryItemRow } from '@trailr/shared';
import { Public } from '../../common/decorators/public.decorator';
import { IngestEmailDto } from './dto/ingest-email.dto';
import { IngestionService } from './ingestion.service';

@Controller('ingest')
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  @Public()
  @Post('email')
  @HttpCode(202)
  ingestEmail(@Body() dto: IngestEmailDto): Promise<InventoryItemRow> {
    return this.ingestion.ingestEmail(dto);
  }
}

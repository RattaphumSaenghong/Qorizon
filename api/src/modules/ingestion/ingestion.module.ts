import { Module } from '@nestjs/common';
import { AuthzModule } from '../../authz/authz.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { FxModule } from '../fx/fx.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IngestionController } from './ingestion.controller';
import { InventoryController } from './inventory.controller';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [PrismaModule, AuthzModule, NotificationsModule, FxModule],
  controllers: [IngestionController, InventoryController],
  providers: [IngestionService],
})
export class IngestionModule {}

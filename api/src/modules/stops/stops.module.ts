import { Module } from '@nestjs/common';
import { StopsController } from './stops.controller';
import { StopReadsController } from './stop-reads.controller';
import { StopsService } from './stops.service';

@Module({
  controllers: [StopsController, StopReadsController],
  providers: [StopsService],
  exports: [StopsService],
})
export class StopsModule {}

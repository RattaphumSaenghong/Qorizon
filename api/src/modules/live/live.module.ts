import { Module } from '@nestjs/common';
import { StopsModule } from '../stops/stops.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';

@Module({
  imports: [StopsModule], // for StopsService.recomputeTripFeedEligibility
  controllers: [LiveController],
  providers: [LiveService],
})
export class LiveModule {}

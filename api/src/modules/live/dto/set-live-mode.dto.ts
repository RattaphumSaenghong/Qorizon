import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { LIVE_CADENCE, type LiveCadence } from '@trailr/shared';

export class SetLiveModeDto {
  @IsBoolean()
  live_mode!: boolean;

  @IsOptional()
  @IsIn(LIVE_CADENCE)
  live_cadence?: LiveCadence;
}

import { IsIn } from 'class-validator';
import { FORK_MODE, type ForkMode } from '@trailr/shared';

export class ForkTripDto {
  @IsIn(FORK_MODE)
  mode!: ForkMode;
}

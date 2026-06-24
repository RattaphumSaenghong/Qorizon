import { IsIn, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { MEDIA_VISIBILITY, type MediaVisibility } from '@trailr/shared';

export class UpdateMediaDto {
  @IsOptional()
  @IsIn(MEDIA_VISIBILITY)
  visibility?: MediaVisibility;

  @IsOptional()
  @ValidateIf((o) => o.stop_id !== null)
  @IsUUID()
  stop_id?: string | null;
}

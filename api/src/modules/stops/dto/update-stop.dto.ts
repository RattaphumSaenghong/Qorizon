import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import {
  STOP_CATEGORY,
  STOP_STATUS,
  type StopCategory,
  type StopStatus,
} from '@trailr/shared';

// Same as CreateStop but every field optional and no trip_id (a stop can't move trips).
export class UpdateStopDto {
  @IsOptional()
  @ValidateIf((o) => o.day_id !== null)
  @IsString()
  day_id?: string | null;

  @IsOptional()
  @IsIn(STOP_STATUS)
  status?: StopStatus;

  @IsOptional()
  @IsIn(STOP_CATEGORY)
  category?: StopCategory;

  @IsOptional()
  @IsString()
  location_name?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  place_id?: string;

  @IsOptional()
  @IsString()
  planned_start?: string;

  @IsOptional()
  @IsString()
  planned_end?: string;

  @IsOptional()
  @IsInt()
  duration_mins?: number;

  @IsOptional()
  @IsInt()
  cost?: number;

  @IsOptional()
  @ValidateIf((o) => o.paid_by !== null)
  @IsUUID()
  paid_by?: string | null;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateIf((o) => o.meta !== null)
  @IsObject()
  meta?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsDateString()
  captured_at?: string;

  @IsOptional()
  @IsIn(['shared', 'assigned'])
  scope?: 'shared' | 'assigned';

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  assignee_ids?: string[];
}

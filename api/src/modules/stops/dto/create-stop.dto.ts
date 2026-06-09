import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  STOP_CATEGORY,
  STOP_STATUS,
  type StopCategory,
  type StopStatus,
} from '@trailr/shared';

export class CreateStopDto {
  @IsString()
  trip_id!: string;

  @IsOptional()
  @IsString()
  day_id?: string;

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
  planned_time?: string;

  @IsOptional()
  @IsInt()
  duration_mins?: number;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsDateString()
  captured_at?: string;
}

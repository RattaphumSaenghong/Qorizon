import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  LIVE_CADENCE,
  TRIP_STATUS,
  TRIP_VISIBILITY,
  type LiveCadence,
  type TripStatus,
  type TripVisibility,
} from '@trailr/shared';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  cover_image_url?: string;

  @IsOptional()
  @IsIn(TRIP_STATUS)
  status?: TripStatus;

  @IsOptional()
  @IsBoolean()
  live_mode?: boolean;

  @IsOptional()
  @IsIn(LIVE_CADENCE)
  live_cadence?: LiveCadence;

  @IsOptional()
  @IsIn(TRIP_VISIBILITY)
  visibility?: TripVisibility;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}

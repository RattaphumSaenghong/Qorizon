import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LIVE_CADENCE,
  TRANSPORT_MODE,
  TRIP_STATUS,
  TRIP_VISIBILITY,
  type LiveCadence,
  type TransportMode,
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
  @IsIn(TRANSPORT_MODE)
  transport_mode?: TransportMode;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  destination?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  budget?: number | null; // null clears it

  @IsOptional()
  @IsString()
  @MaxLength(8)
  budget_currency?: string;

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

import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { BOOKING_TYPE, type BookingType } from '@trailr/shared';

export class SearchBookingDto {
  @IsIn(BOOKING_TYPE)
  type!: BookingType;

  @IsOptional()
  @IsString()
  trip_id?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  depart_date?: string;

  @IsOptional()
  @IsString()
  return_date?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  check_in?: string;

  @IsOptional()
  @IsInt()
  nights?: number;
}

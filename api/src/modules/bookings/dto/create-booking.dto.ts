import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import {
  BOOKING_PROVIDER,
  BOOKING_TYPE,
  type BookingProvider,
  type BookingType,
} from '@trailr/shared';

export class CreateBookingDto {
  @IsIn(BOOKING_TYPE)
  type!: BookingType;

  @IsIn(BOOKING_PROVIDER)
  provider!: BookingProvider;

  @IsOptional()
  @IsString()
  trip_id?: string;

  @IsOptional()
  @IsString()
  external_ref?: string;

  @IsNumber()
  amount_thb!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

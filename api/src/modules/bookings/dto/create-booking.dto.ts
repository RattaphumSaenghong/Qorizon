import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  BOOKING_PROVIDER,
  BOOKING_TYPE,
  type BookingProvider,
  type BookingType,
  type GuestDetails,
  type PassengerDetails,
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

  @IsOptional()
  @IsObject()
  passenger_details?: PassengerDetails;

  @IsOptional()
  @IsObject()
  guest_details?: GuestDetails;

  // Who this booking is for (creates an assigned logistics block in the itinerary)
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  assignee_ids?: string[];
}

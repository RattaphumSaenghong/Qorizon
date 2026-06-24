import { IsDateString, IsOptional, IsString, ValidateIf } from 'class-validator';

// Edit a day's label/date. Pass null to clear either field.
export class UpdateTripDayDto {
  @IsOptional()
  @ValidateIf((o) => o.place !== null)
  @IsString()
  place?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.date !== null)
  @IsDateString()
  date?: string | null;
}

import { IsOptional, IsString } from 'class-validator';

export class SaveItemDto {
  @IsOptional()
  @IsString()
  stop_id?: string;

  @IsOptional()
  @IsString()
  trip_id?: string;
}

import { IsString } from 'class-validator';

export class MatchInventoryDto {
  @IsString()
  trip_id!: string;
}

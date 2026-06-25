import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class HotelRatesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  hotelIds!: string[];

  @IsDateString()
  check_in!: string;

  @IsDateString()
  check_out!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  adults?: number;
}

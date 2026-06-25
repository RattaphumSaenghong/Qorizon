import { IsNumberString, IsOptional } from 'class-validator';

export class HotelCatalogQueryDto {
  @IsNumberString()
  lat!: string;

  @IsNumberString()
  lng!: string;

  @IsNumberString()
  radius!: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

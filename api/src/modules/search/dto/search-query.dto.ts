import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  limit?: number;
}

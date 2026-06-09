import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class PublishBatchDto {
  @IsOptional()
  @IsDateString()
  batch_date?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop_ids?: string[];
}

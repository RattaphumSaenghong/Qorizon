import { IsOptional, IsString } from 'class-validator';

export class IngestEmailDto {
  @IsString()
  from!: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  body_text?: string;

  @IsOptional()
  @IsString()
  body_html?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}

import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { MEDIA_TYPE, type MediaType } from '@trailr/shared';

export class UploadMediaDto {
  @IsIn(MEDIA_TYPE)
  type!: MediaType;

  /** base64 payload (a data: URL prefix is tolerated and stripped). */
  @IsString()
  content_base64!: string;

  @IsString()
  content_type!: string; // e.g. image/jpeg

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  captured_at?: string;
}

import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { MEDIA_TYPE, MEDIA_VISIBILITY, type MediaType, type MediaVisibility } from '@trailr/shared';

export class UploadMediaDto {
  @IsIn(MEDIA_TYPE)
  type!: MediaType;

  /** base64 payload (a data: URL prefix is tolerated and stripped). */
  @IsString()
  content_base64!: string;

  @IsString()
  content_type!: string;

  @IsOptional()
  @IsIn(MEDIA_VISIBILITY)
  visibility?: MediaVisibility;

  @IsOptional()
  @IsUUID()
  stop_id?: string;

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

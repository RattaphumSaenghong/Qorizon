import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateAlbumDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  order?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excluded?: string[];

  @IsOptional()
  @IsObject()
  captions?: Record<string, string>;
}

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { USER_LANGUAGE, type UserLanguage } from '@trailr/shared';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  display_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsIn(USER_LANGUAGE)
  language?: UserLanguage;
}

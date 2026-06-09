import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { USER_LANGUAGE, type UserLanguage } from '@trailr/shared';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_.]+$/, {
    message: 'username may only contain lowercase letters, numbers, _ and .',
  })
  username?: string;

  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsIn(USER_LANGUAGE)
  language?: UserLanguage;
}

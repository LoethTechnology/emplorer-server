import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import {
  normalizeEmailValue,
  normalizeOptionalUrl,
  trimStringValue,
} from '../utils/users.utils';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'test@test.com',
    description: 'The email of the user',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => normalizeEmailValue(value))
  email?: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'The first name of the user',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => trimStringValue(value))
  first_name?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'The last name of the user',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => trimStringValue(value))
  last_name?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'The avatar URL of the user',
  })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => normalizeOptionalUrl(value))
  avatar_url?: string;

  @ApiPropertyOptional({
    example: 'https://linkedin.com/in/test-user',
    description: 'The LinkedIn profile URL of the user',
  })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => normalizeOptionalUrl(value))
  linkedin_profile_url?: string;
}

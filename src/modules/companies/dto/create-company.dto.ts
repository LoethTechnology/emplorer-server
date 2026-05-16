import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsFQDN,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeOptionalUrl = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Inc.', description: 'Company name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(trim)
  name!: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(trim)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://acme.com',
    description: 'Company website URL',
  })
  @IsOptional()
  @IsUrl()
  @Transform(normalizeOptionalUrl)
  website_url?: string;

  @ApiPropertyOptional({
    example: 'acme.com',
    description: 'Unique company domain used for duplicate detection',
  })
  @IsOptional()
  @IsFQDN()
  @Transform(trim)
  domain?: string;

  @ApiPropertyOptional({
    example: 'https://linkedin.com/company/acme',
    description: 'Company LinkedIn URL',
  })
  @IsOptional()
  @IsUrl()
  @Transform(normalizeOptionalUrl)
  linkedin_url?: string;

  @ApiPropertyOptional({
    example: 'https://acme.com/logo.png',
    description: 'Company logo URL',
  })
  @IsOptional()
  @IsUrl()
  @Transform(normalizeOptionalUrl)
  logo_url?: string;

  @ApiPropertyOptional({
    example: 'Lagos, Nigeria',
    description: 'Company headquarters location',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(trim)
  headquarters?: string;

  @ApiPropertyOptional({
    example: 'Technology',
    description: 'Company industry',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  industry?: string;
}

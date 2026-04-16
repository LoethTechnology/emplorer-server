import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ReviewStatus } from 'prisma/generated/prisma/enums';
import { trimStringValue } from '../utils/user.utils';

export class CreateUserReviewDto {
  @ApiProperty({
    example: 'cm9company123',
    description: 'The company identifier for the review',
  })
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => trimStringValue(value))
  company_id!: string;

  @ApiProperty({
    example: 'Strong engineering culture with supportive managers.',
    description: 'The review body',
  })
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => trimStringValue(value))
  body!: string;

  @ApiProperty({
    example: 4,
    description: 'The overall rating for the company review',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  overall_rating!: number;

  @ApiPropertyOptional({
    example: 'Former full-time backend engineer',
    description: 'Optional employment context for the review',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => trimStringValue(value))
  employment_context?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the reviewer would recommend the company',
  })
  @IsOptional()
  @IsBoolean()
  would_recommend?: boolean;

  @ApiPropertyOptional({
    enum: ReviewStatus,
    example: ReviewStatus.DRAFT,
    description: 'The publication status of the review',
  })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}

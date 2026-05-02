import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReviewDto {
  @ApiProperty({
    example: 'cm9company123',
    description: 'The company identifier for the review',
  })
  @IsString()
  @MinLength(1)
  @Transform(trim)
  company_id!: string;

  @ApiProperty({
    example: 'Strong engineering culture with supportive managers.',
    description: 'The review body',
  })
  @IsString()
  @MinLength(1)
  @Transform(trim)
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
  @Transform(trim)
  employment_context?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the reviewer would recommend the company',
  })
  @IsOptional()
  @IsBoolean()
  would_recommend?: boolean;
}

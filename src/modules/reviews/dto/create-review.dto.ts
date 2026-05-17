import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateReviewDto {
  @ApiProperty({ description: 'Review body' })
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  @Transform(trim)
  body!: string;

  @ApiProperty({ description: 'Overall rating (1–5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  overall_rating!: number;

  @ApiPropertyOptional({
    description: 'Employment context (e.g. Full-time, Contractor)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  employment_context?: string;

  @ApiPropertyOptional({
    description: 'Whether the reviewer would recommend the company',
  })
  @IsOptional()
  @IsBoolean()
  would_recommend?: boolean;

  @ApiPropertyOptional({
    description: 'ID of the company location this review is for',
  })
  @IsOptional()
  @IsString()
  location_id?: string;
}

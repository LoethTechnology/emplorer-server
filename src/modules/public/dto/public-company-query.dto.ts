import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BaseQueryDto } from '@shared/dtos';

export class PublicCompanyQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    example: 'Acme',
    description: 'Filter by company name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 'Lekki',
    description: 'Filter by address or country',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional({ example: 4, description: 'Minimum mean rating (1–5)' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string))
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

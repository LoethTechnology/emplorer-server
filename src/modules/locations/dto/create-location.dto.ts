import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateLocationDto {
  @ApiProperty({ example: 'Lagos', description: 'City name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trim)
  city!: string;

  @ApiPropertyOptional({
    example: 'Lagos State',
    description: 'State or province',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  state?: string;

  @ApiProperty({ example: 'Nigeria', description: 'Country name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trim)
  country!: string;

  @ApiPropertyOptional({
    example: '14 Admiralty Way, Lekki',
    description: 'Street address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(trim)
  address?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the company headquarters',
  })
  @IsOptional()
  @IsBoolean()
  is_headquarters?: boolean;
}

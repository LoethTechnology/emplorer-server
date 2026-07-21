import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateLocationDto {
  @ApiProperty({
    example: '14 Admiralty Way, Lekki',
    description: 'Street address',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  @Transform(trim)
  address!: string;

  @ApiPropertyOptional({
    example: 'Nigeria',
    description: 'Country name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  country?: string;
}

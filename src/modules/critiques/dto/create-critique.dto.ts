import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCritiqueDto {
  @ApiProperty({ description: 'Critique title' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Transform(trim)
  title!: string;

  @ApiProperty({ description: 'Critique body' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  @Transform(trim)
  body!: string;

  @ApiProperty({ description: 'Rating (1–5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

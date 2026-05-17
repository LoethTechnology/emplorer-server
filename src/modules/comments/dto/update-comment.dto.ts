import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateCommentDto {
  @ApiProperty({ description: 'Updated comment body' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @Transform(trim)
  body!: string;
}

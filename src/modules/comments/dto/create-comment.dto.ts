import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment body' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @Transform(trim)
  body!: string;

  @ApiPropertyOptional({
    description: 'ID of the parent comment (for threaded replies)',
  })
  @IsOptional()
  @IsString()
  parent_comment_id?: string;
}

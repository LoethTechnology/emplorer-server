import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive, Length, Min } from 'class-validator';

export enum SortEnum {
  asc = 'asc',
  desc = 'desc',
}

export class BaseQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsPositive()
  @Min(1)
  page?: number | undefined;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsPositive()
  @Min(1)
  limit?: number | undefined;

  @ApiPropertyOptional()
  @IsOptional()
  @Length(0, 255)
  search?: string | undefined;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(SortEnum)
  sort?: SortEnum | undefined;
}

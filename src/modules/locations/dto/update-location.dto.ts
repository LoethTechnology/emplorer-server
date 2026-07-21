import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLocationDto } from './create-location.dto';

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  @ApiPropertyOptional({
    description: 'Whether this is the company headquarters',
  })
  @IsOptional()
  @IsBoolean()
  is_headquarters?: boolean;
}

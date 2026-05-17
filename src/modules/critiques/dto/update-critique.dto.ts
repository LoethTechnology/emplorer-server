import { PartialType } from '@nestjs/swagger';
import { CreateCritiqueDto } from './create-critique.dto';

export class UpdateCritiqueDto extends PartialType(CreateCritiqueDto) {}

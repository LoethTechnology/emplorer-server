import { PartialType } from '@nestjs/mapped-types';
import { OmitType } from '@nestjs/swagger';
import { CreateUserReviewDto } from './create-user-review.dto';

export class UpdateUserReviewDto extends PartialType(
  OmitType(CreateUserReviewDto, ['company_id'] as const),
) {}

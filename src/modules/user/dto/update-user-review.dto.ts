import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReviewStatus } from 'prisma/generated/prisma/enums';
import { CreateUserReviewDto } from './create-user-review.dto';

export class UpdateUserReviewDto extends PartialType(
  OmitType(CreateUserReviewDto, ['company_id'] as const),
) {
  @ApiPropertyOptional({
    enum: ReviewStatus,
    example: ReviewStatus.HIDDEN,
    description:
      'The publication status of the review. Reviews are published immediately on creation; use this to hide or remove a review afterwards.',
  })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}

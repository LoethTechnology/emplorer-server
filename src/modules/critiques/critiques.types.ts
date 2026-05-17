import type { review_critique } from 'prisma/generated/prisma/client';
import type { ApiSuccessResponse } from '../../shared/utils/response';

export type ReviewCritique = review_critique;
export type ReviewCritiqueResponse = ApiSuccessResponse<ReviewCritique>;

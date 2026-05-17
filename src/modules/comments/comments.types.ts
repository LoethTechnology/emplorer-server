import type {
  comment_vote,
  review_comment,
} from 'prisma/generated/prisma/client';
import type { ApiSuccessResponse } from '../../shared/utils/response';

export type ReviewComment = review_comment;
export type CommentVote = comment_vote;
export type ReviewCommentResponse = ApiSuccessResponse<ReviewComment>;
export type CommentVoteResponse = ApiSuccessResponse<CommentVote | null>;

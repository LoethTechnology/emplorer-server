import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommentStatus, ReviewStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import { MailService } from '../../shared/modules/mail';
import {
  CrudEnums,
  DbModels,
  PaginationResponseInterface,
} from '../../shared/types';
import { CrudResponse } from '../../shared/utils/response';
import { GetPageOptions, PaginateRes } from '@shared/index';
import { BaseQueryDto } from '@shared/dtos';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import type { CreateCommentDto, UpdateCommentDto, VoteCommentDto } from './dto';
import type {
  ReviewComment,
  ReviewCommentResponse,
  CommentVoteResponse,
} from './comments.types';

const MESSAGES = {
  reviewNotFound: 'Review not found.',
  commentNotFound: 'Comment not found.',
  commentForbidden: 'You are not allowed to modify this comment.',
  parentCommentNotFound:
    'Parent comment not found or does not belong to this review.',
} as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    dto: CreateCommentDto,
  ): Promise<ReviewCommentResponse> {
    const review = await this.findPublishedReviewOrThrow(reviewId);

    if (dto.parent_comment_id) {
      await this.assertParentCommentBelongsToReview(
        reviewId,
        dto.parent_comment_id,
      );
    }

    const comment = await this.prismaService.review_comment.create({
      data: {
        review_id: reviewId,
        author_id: user.sub,
        body: dto.body,
        parent_comment_id: dto.parent_comment_id ?? null,
      },
    });

    if (review.author_id !== user.sub) {
      this.prismaService.user
        .findUnique({
          where: { id: review.author_id },
          select: { email: true, first_name: true },
        })
        .then((author) => {
          if (author?.email) {
            this.mailService
              .sendNewCommentEmail(author.email, author.first_name)
              .catch(() => {});
          }
        })
        .catch(() => {});
    }

    return CrudResponse(DbModels.REVIEW_COMMENT, CrudEnums.CREATE, comment);
  }

  async findAll(
    reviewId: string,
    query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<ReviewComment>> {
    const { page, limit, sort } = query;

    const where = {
      review_id: reviewId,
      parent_comment_id: null,
      status: { not: CommentStatus.REMOVED },
    };

    const [count, records] = await Promise.all([
      this.prismaService.review_comment.count({ where }),
      this.prismaService.review_comment.findMany({
        ...GetPageOptions(Number(page), Number(limit)),
        where,
        orderBy: { created_at: sort || 'asc' },
        include: {
          replies: {
            where: { status: { not: CommentStatus.REMOVED } },
            orderBy: { created_at: 'asc' },
          },
        },
      }),
    ]);

    return PaginateRes(
      records,
      count,
      records.length,
      Number(page),
      Number(limit),
    );
  }

  async findOne(
    reviewId: string,
    commentId: string,
  ): Promise<ReviewCommentResponse> {
    const comment = await this.prismaService.review_comment.findFirst({
      where: {
        id: commentId,
        review_id: reviewId,
        status: { not: CommentStatus.REMOVED },
      },
      include: {
        replies: {
          where: { status: { not: CommentStatus.REMOVED } },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(MESSAGES.commentNotFound);
    }

    return CrudResponse(DbModels.REVIEW_COMMENT, CrudEnums.READ, comment);
  }

  async update(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ): Promise<ReviewCommentResponse> {
    const existing = await this.findOwnedCommentOrThrow(
      user.sub,
      reviewId,
      commentId,
    );

    const updated = await this.prismaService.review_comment.update({
      where: { id: existing.id },
      data: { body: dto.body },
    });

    return CrudResponse(DbModels.REVIEW_COMMENT, CrudEnums.UPDATE, updated);
  }

  async remove(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    commentId: string,
  ): Promise<ReviewCommentResponse> {
    const existing = await this.findOwnedCommentOrThrow(
      user.sub,
      reviewId,
      commentId,
    );

    const deleted = await this.prismaService.review_comment.delete({
      where: { id: existing.id },
    });

    return CrudResponse(DbModels.REVIEW_COMMENT, CrudEnums.DELETE, deleted);
  }

  async castVote(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    commentId: string,
    dto: VoteCommentDto,
  ): Promise<CommentVoteResponse> {
    await this.findVisibleCommentOrThrow(reviewId, commentId);

    const vote = await this.prismaService.comment_vote.upsert({
      where: {
        comment_id_user_id: { comment_id: commentId, user_id: user.sub },
      },
      create: {
        comment_id: commentId,
        user_id: user.sub,
        value: dto.value,
      },
      update: { value: dto.value },
    });

    return CrudResponse(DbModels.COMMENT_VOTE, CrudEnums.CREATE, vote);
  }

  async removeVote(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    commentId: string,
  ): Promise<CommentVoteResponse> {
    await this.findVisibleCommentOrThrow(reviewId, commentId);

    const existing = await this.prismaService.comment_vote.findUnique({
      where: {
        comment_id_user_id: { comment_id: commentId, user_id: user.sub },
      },
    });

    if (!existing) {
      throw new NotFoundException('Vote not found.');
    }

    const deleted = await this.prismaService.comment_vote.delete({
      where: {
        comment_id_user_id: { comment_id: commentId, user_id: user.sub },
      },
    });

    return CrudResponse(DbModels.COMMENT_VOTE, CrudEnums.DELETE, deleted);
  }

  private async findPublishedReviewOrThrow(reviewId: string) {
    const review = await this.prismaService.company_review.findFirst({
      where: { id: reviewId, status: ReviewStatus.PUBLISHED },
      select: { id: true, author_id: true },
    });

    if (!review) {
      throw new NotFoundException(MESSAGES.reviewNotFound);
    }

    return review;
  }

  private async findVisibleCommentOrThrow(
    reviewId: string,
    commentId: string,
  ): Promise<ReviewComment> {
    const comment = await this.prismaService.review_comment.findFirst({
      where: {
        id: commentId,
        review_id: reviewId,
        status: { not: CommentStatus.REMOVED },
      },
    });

    if (!comment) {
      throw new NotFoundException(MESSAGES.commentNotFound);
    }

    return comment;
  }

  private async findOwnedCommentOrThrow(
    userId: string,
    reviewId: string,
    commentId: string,
  ): Promise<ReviewComment> {
    const comment = await this.prismaService.review_comment.findFirst({
      where: {
        id: commentId,
        review_id: reviewId,
        status: { not: CommentStatus.REMOVED },
      },
    });

    if (!comment) {
      throw new NotFoundException(MESSAGES.commentNotFound);
    }

    if (comment.author_id !== userId) {
      throw new ForbiddenException(MESSAGES.commentForbidden);
    }

    return comment;
  }

  private async assertParentCommentBelongsToReview(
    reviewId: string,
    parentCommentId: string,
  ): Promise<void> {
    const parent = await this.prismaService.review_comment.findFirst({
      where: {
        id: parentCommentId,
        review_id: reviewId,
      },
      select: { id: true },
    });

    if (!parent) {
      throw new UnprocessableEntityException(MESSAGES.parentCommentNotFound);
    }
  }
}

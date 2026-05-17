import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReviewStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import {
  CrudEnums,
  DbModels,
  PaginationResponseInterface,
} from '../../shared/types';
import { CrudResponse } from '../../shared/utils/response';
import { GetPageOptions, PaginateRes } from '@shared/index';
import { BaseQueryDto } from '@shared/dtos';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import type { CreateCritiqueDto, UpdateCritiqueDto } from './dto';
import type { ReviewCritique, ReviewCritiqueResponse } from './critiques.types';

const MESSAGES = {
  reviewNotFound: 'Review not found.',
  critiqueNotFound: 'Critique not found.',
  critiqueForbidden: 'You are not allowed to modify this critique.',
} as const;

@Injectable()
export class CritiquesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    dto: CreateCritiqueDto,
  ): Promise<ReviewCritiqueResponse> {
    await this.findPublishedReviewOrThrow(reviewId);

    const critique = await this.prismaService.review_critique.create({
      data: {
        review_id: reviewId,
        author_id: user.sub,
        title: dto.title,
        body: dto.body,
        rating: dto.rating,
        status: ReviewStatus.PUBLISHED,
        published_at: new Date(),
      },
    });

    return CrudResponse(DbModels.REVIEW_CRITIQUE, CrudEnums.CREATE, critique);
  }

  async findAll(
    reviewId: string,
    query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<ReviewCritique>> {
    const { page, limit, sort } = query;

    const where = {
      review_id: reviewId,
      status: ReviewStatus.PUBLISHED,
    };

    const [count, records] = await Promise.all([
      this.prismaService.review_critique.count({ where }),
      this.prismaService.review_critique.findMany({
        ...GetPageOptions(Number(page), Number(limit)),
        where,
        orderBy: { published_at: sort || 'desc' },
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
    critiqueId: string,
  ): Promise<ReviewCritiqueResponse> {
    const critique = await this.prismaService.review_critique.findFirst({
      where: {
        id: critiqueId,
        review_id: reviewId,
        status: ReviewStatus.PUBLISHED,
      },
    });

    if (!critique) {
      throw new NotFoundException(MESSAGES.critiqueNotFound);
    }

    return CrudResponse(DbModels.REVIEW_CRITIQUE, CrudEnums.READ, critique);
  }

  async update(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    critiqueId: string,
    dto: UpdateCritiqueDto,
  ): Promise<ReviewCritiqueResponse> {
    const existing = await this.findOwnedCritiqueOrThrow(
      user.sub,
      reviewId,
      critiqueId,
    );

    const updated = await this.prismaService.review_critique.update({
      where: { id: existing.id },
      data: {
        title: dto.title ?? existing.title,
        body: dto.body ?? existing.body,
        rating: dto.rating ?? existing.rating,
      },
    });

    return CrudResponse(DbModels.REVIEW_CRITIQUE, CrudEnums.UPDATE, updated);
  }

  async remove(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    critiqueId: string,
  ): Promise<ReviewCritiqueResponse> {
    const existing = await this.findOwnedCritiqueOrThrow(
      user.sub,
      reviewId,
      critiqueId,
    );

    const deleted = await this.prismaService.review_critique.delete({
      where: { id: existing.id },
    });

    return CrudResponse(DbModels.REVIEW_CRITIQUE, CrudEnums.DELETE, deleted);
  }

  private async findPublishedReviewOrThrow(reviewId: string) {
    const review = await this.prismaService.company_review.findFirst({
      where: { id: reviewId, status: ReviewStatus.PUBLISHED },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException(MESSAGES.reviewNotFound);
    }

    return review;
  }

  private async findOwnedCritiqueOrThrow(
    userId: string,
    reviewId: string,
    critiqueId: string,
  ): Promise<ReviewCritique> {
    const critique = await this.prismaService.review_critique.findFirst({
      where: { id: critiqueId, review_id: reviewId },
    });

    if (!critique) {
      throw new NotFoundException(MESSAGES.critiqueNotFound);
    }

    if (critique.author_id !== userId) {
      throw new ForbiddenException(MESSAGES.critiqueForbidden);
    }

    return critique;
  }
}

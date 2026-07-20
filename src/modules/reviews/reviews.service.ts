import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CompanyStatus, ReviewStatus } from 'prisma/generated/prisma/enums';
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
import type { CreateReviewDto, UpdateReviewDto } from './dto';
import type { company_review } from 'prisma/generated/prisma/client';
import type { ApiSuccessResponse } from '../../shared/utils/response';

const MESSAGES = {
  companyNotFound: 'Company not found.',
  reviewNotFound: 'Review not found.',
  reviewForbidden: 'You are not allowed to modify this review.',
  locationNotBelongToCompany:
    'The specified location does not belong to this company.',
} as const;

type Review = company_review;
type ReviewResponse = ApiSuccessResponse<Review>;

@Injectable()
export class ReviewsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    user: AuthenticatedRequest['user'],
    companyId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    await this.findApprovedCompanyOrThrow(companyId);

    if (dto.location_id) {
      await this.assertLocationBelongsToCompany(companyId, dto.location_id);
    }

    const review = await this.prismaService.company_review.create({
      data: {
        company_id: companyId,
        author_id: user.sub,
        location_id: dto.location_id ?? null,
        body: dto.body,
        overall_rating: dto.overall_rating,
        employment_context: dto.employment_context ?? null,
        would_recommend: dto.would_recommend ?? null,
        status: ReviewStatus.PUBLISHED,
        published_at: new Date(),
      },
    });

    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.CREATE, review);
  }

  async findAll(
    companyId: string,
    query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<Review>> {
    const { page, limit, sort } = query;

    const where = {
      company_id: companyId,
      status: ReviewStatus.PUBLISHED,
    };

    const [count, records] = await Promise.all([
      this.prismaService.company_review.count({ where }),
      this.prismaService.company_review.findMany({
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

  async findOne(companyId: string, reviewId: string): Promise<ReviewResponse> {
    const review = await this.prismaService.company_review.findFirst({
      where: {
        id: reviewId,
        company_id: companyId,
        status: ReviewStatus.PUBLISHED,
      },
    });

    if (!review) {
      throw new NotFoundException(MESSAGES.reviewNotFound);
    }

    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.READ, review);
  }

  async update(
    user: AuthenticatedRequest['user'],
    companyId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponse> {
    const existing = await this.findOwnedReviewOrThrow(
      user.sub,
      companyId,
      reviewId,
    );

    if (dto.location_id && dto.location_id !== existing.location_id) {
      await this.assertLocationBelongsToCompany(companyId, dto.location_id);
    }

    const updated = await this.prismaService.company_review.update({
      where: { id: existing.id },
      data: {
        body: dto.body ?? existing.body,
        overall_rating: dto.overall_rating ?? existing.overall_rating,
        employment_context:
          dto.employment_context !== undefined
            ? dto.employment_context
            : existing.employment_context,
        would_recommend:
          dto.would_recommend !== undefined
            ? dto.would_recommend
            : existing.would_recommend,
        location_id:
          dto.location_id !== undefined
            ? dto.location_id
            : existing.location_id,
      },
    });

    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.UPDATE, updated);
  }

  async remove(
    user: AuthenticatedRequest['user'],
    companyId: string,
    reviewId: string,
  ): Promise<ReviewResponse> {
    const existing = await this.findOwnedReviewOrThrow(
      user.sub,
      companyId,
      reviewId,
    );

    const deleted = await this.prismaService.company_review.delete({
      where: { id: existing.id },
    });

    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.DELETE, deleted);
  }

  private async findApprovedCompanyOrThrow(companyId: string) {
    const company = await this.prismaService.company.findFirst({
      where: { id: companyId, status: CompanyStatus.APPROVED },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException(MESSAGES.companyNotFound);
    }

    return company;
  }

  private async findOwnedReviewOrThrow(
    userId: string,
    companyId: string,
    reviewId: string,
  ): Promise<Review> {
    const review = await this.prismaService.company_review.findFirst({
      where: { id: reviewId, company_id: companyId },
    });

    if (!review) {
      throw new NotFoundException(MESSAGES.reviewNotFound);
    }

    if (review.author_id !== userId) {
      throw new ForbiddenException(MESSAGES.reviewForbidden);
    }

    return review;
  }

  private async assertLocationBelongsToCompany(
    companyId: string,
    locationId: string,
  ): Promise<void> {
    const location = await this.prismaService.company_location.findFirst({
      where: { id: locationId, company_id: companyId },
      select: { id: true },
    });

    if (!location) {
      throw new UnprocessableEntityException(
        MESSAGES.locationNotBelongToCompany,
      );
    }
  }
}

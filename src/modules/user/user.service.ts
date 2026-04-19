import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ReviewStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import {
  CrudEnums,
  DbModels,
  PaginationResponseInterface,
} from '../../shared/types';
import { CrudResponse } from '../../shared/utils/response';
import type {
  CreateUserDto,
  CreateUserReviewDto,
  UpdateUserDto,
  UpdateUserPasswordDto,
  UpdateUserReviewDto,
} from './dto';
import type {
  PublicUser,
  UserMessageResponse,
  UserReview,
  UserReviewResponse,
  UserResponse,
  UserWithPassword,
  AuthenticatedRequest,
} from './user.types';
import {
  isForeignKeyConstraintError,
  USER_RESPONSE_MESSAGES,
} from './utils/user.utils';
import { BaseQueryDto } from '@shared/dtos';
import { PaginateRes, GetPageOptions } from '@shared/index';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    const existingUser = await this.findUserWithPasswordByEmail(
      createUserDto.email,
    );
    const userData = {
      email: createUserDto.email,
      first_name: createUserDto.first_name,
      last_name: createUserDto.last_name,
      password: await argon2.hash(createUserDto.password),
      avatar_url: createUserDto.avatar_url ?? null,
      linkedin_profile_url: createUserDto.linkedin_profile_url ?? null,
    };

    if (existingUser?.deleted_at) {
      throw new ConflictException(USER_RESPONSE_MESSAGES.emailAlreadyInUse);
    }

    if (existingUser?.password) {
      throw new ConflictException(USER_RESPONSE_MESSAGES.localAccountExists);
    }

    if (existingUser) {
      const updatedUser = await this.prismaService.user.update({
        where: { id: existingUser.id },
        data: userData,
      });

      return CrudResponse(DbModels.USER, CrudEnums.CREATE, updatedUser);
    }

    const createdUser = await this.prismaService.user.create({
      data: userData,
    });

    return CrudResponse(DbModels.USER, CrudEnums.CREATE, createdUser);
  }

  async findMe(user: AuthenticatedRequest['user']): Promise<UserResponse> {
    const dbUser = await this.findActiveUserById(user.sub);

    return CrudResponse(DbModels.USER, CrudEnums.READ, dbUser);
  }

  async updateMe(
    user: AuthenticatedRequest['user'],
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    const userId = user.sub;
    await this.findActiveUserById(userId);
    const data = { ...updateUserDto };

    if (data.email) {
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(USER_RESPONSE_MESSAGES.emailAlreadyInUse);
      }
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data,
    });

    return CrudResponse(DbModels.USER, CrudEnums.UPDATE, updatedUser);
  }

  async updatePassword(
    user: AuthenticatedRequest['user'],
    updateUserPasswordDto: UpdateUserPasswordDto,
  ): Promise<UserMessageResponse> {
    const userId = user.sub;
    const dbUser = await this.findUserWithPasswordById(userId);

    if (dbUser.deleted_at) {
      throw new NotFoundException(USER_RESPONSE_MESSAGES.userNotFound);
    }

    if (!dbUser.email || !dbUser.password) {
      throw new BadRequestException(
        USER_RESPONSE_MESSAGES.localPasswordRequired,
      );
    }

    const currentPasswordMatches = await argon2.verify(
      dbUser.password,
      updateUserPasswordDto.oldPassword,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException(USER_RESPONSE_MESSAGES.invalidPassword);
    }

    const nextPasswordHash = await argon2.hash(
      updateUserPasswordDto.newPassword,
    );

    await this.prismaService.user.update({
      where: { id: userId },
      data: { password: nextPasswordHash },
    });

    return CrudResponse(
      DbModels.USER,
      CrudEnums.UPDATE,
      USER_RESPONSE_MESSAGES.passwordUpdated,
    );
  }

  async createMyReview(
    user: AuthenticatedRequest['user'],
    createUserReviewDto: CreateUserReviewDto,
  ): Promise<UserReviewResponse> {
    const userId = user.sub;
    await this.findActiveUserById(userId);
    await this.findCompanyOrThrow(createUserReviewDto.company_id);

    const reviewStatus = createUserReviewDto.status ?? ReviewStatus.DRAFT;
    const createdReview = await this.prismaService.company_review.create({
      data: {
        company_id: createUserReviewDto.company_id,
        author_id: userId,
        body: createUserReviewDto.body,
        overall_rating: createUserReviewDto.overall_rating,
        employment_context: createUserReviewDto.employment_context ?? null,
        would_recommend: createUserReviewDto.would_recommend ?? null,
        status: reviewStatus,
        published_at:
          reviewStatus === ReviewStatus.PUBLISHED ? new Date() : null,
      },
    });

    return CrudResponse(
      DbModels.COMPANY_REVIEW,
      CrudEnums.CREATE,
      createdReview,
    );
  }

  async findMyReviews(
    user: AuthenticatedRequest['user'],
    query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<UserReview>> {
    const userId = user.sub;
    const { page, limit, search, sort } = query;
    await this.findActiveUserById(userId);

    const [count, records] = await Promise.all([
      this.prismaService.company_review.count({
        where: { author_id: userId, ...(search && { name: search }) },
      }),
      this.prismaService.company_review.findMany({
        ...GetPageOptions(Number(page), Number(limit)),
        where: { author_id: userId, ...(search && { name: search }) },
        orderBy: { created_at: sort || 'desc' },
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

  async findMyReview(
    user: AuthenticatedRequest['user'],
    reviewId: string,
  ): Promise<UserReviewResponse> {
    const userId = user.sub;
    await this.findActiveUserById(userId);
    const review = await this.findOwnedReviewOrThrow(userId, reviewId);

    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.READ, review);
  }

  async updateMyReview(
    user: AuthenticatedRequest['user'],
    reviewId: string,
    updateUserReviewDto: UpdateUserReviewDto,
  ): Promise<UserReviewResponse> {
    const userId = user.sub;
    await this.findActiveUserById(userId);
    const existingReview = await this.findOwnedReviewOrThrow(userId, reviewId);
    const nextStatus = updateUserReviewDto.status ?? existingReview.status;

    const updatedReview = await this.prismaService.company_review.update({
      where: { id: reviewId },
      data: {
        ...updateUserReviewDto,
        employment_context:
          updateUserReviewDto.employment_context ??
          existingReview.employment_context,
        would_recommend:
          updateUserReviewDto.would_recommend ?? existingReview.would_recommend,
        status: nextStatus,
        published_at: this.resolvePublishedAt(existingReview, nextStatus),
      },
    });

    return CrudResponse(
      DbModels.COMPANY_REVIEW,
      CrudEnums.UPDATE,
      updatedReview,
    );
  }

  async removeMyReview(
    user: AuthenticatedRequest['user'],
    reviewId: string,
  ): Promise<UserMessageResponse> {
    const userId = user.sub;
    await this.findActiveUserById(userId);
    await this.findOwnedReviewOrThrow(userId, reviewId);

    await this.prismaService.company_review.delete({
      where: { id: reviewId },
    });

    return CrudResponse(
      DbModels.COMPANY_REVIEW,
      CrudEnums.DELETE,
      USER_RESPONSE_MESSAGES.reviewDeleted,
    );
  }

  async removeMe(
    user: AuthenticatedRequest['user'],
  ): Promise<UserMessageResponse> {
    const userId = user.sub;
    await this.findActiveUserById(userId);

    try {
      await this.prismaService.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new ConflictException(
          USER_RESPONSE_MESSAGES.accountDeleteBlocked,
        );
      }

      throw error;
    }

    return CrudResponse(
      DbModels.USER,
      CrudEnums.DELETE,
      USER_RESPONSE_MESSAGES.accountDeleted,
    );
  }

  private async findActiveUserById(userId: string): Promise<PublicUser> {
    const dbUser = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser || dbUser.deleted_at) {
      throw new NotFoundException(USER_RESPONSE_MESSAGES.userNotFound);
    }

    return dbUser;
  }

  private async findCompanyOrThrow(companyId: string): Promise<void> {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException(USER_RESPONSE_MESSAGES.companyNotFound);
    }
  }

  private async findOwnedReviewOrThrow(
    userId: string,
    reviewId: string,
  ): Promise<UserReview> {
    const review = await this.prismaService.company_review.findFirst({
      where: {
        id: reviewId,
        author_id: userId,
      },
    });

    if (!review) {
      throw new NotFoundException(USER_RESPONSE_MESSAGES.reviewNotFound);
    }

    return review;
  }

  private async findUserWithPasswordById(
    userId: string,
  ): Promise<UserWithPassword> {
    const dbUser = (await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        deleted_at: true,
      },
    })) as UserWithPassword | null;

    if (!dbUser) {
      throw new NotFoundException(USER_RESPONSE_MESSAGES.userNotFound);
    }

    return dbUser;
  }

  private async findUserWithPasswordByEmail(
    email: string,
  ): Promise<UserWithPassword | null> {
    return (await this.prismaService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        deleted_at: true,
      },
    })) as UserWithPassword | null;
  }

  private resolvePublishedAt(
    existingReview: UserReview,
    nextStatus: ReviewStatus,
  ): Date | null {
    if (nextStatus !== ReviewStatus.PUBLISHED) {
      return null;
    }

    return existingReview.published_at ?? new Date();
  }
}

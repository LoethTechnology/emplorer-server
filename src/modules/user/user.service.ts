import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { ReviewStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma/prisma.service';
import { CrudEnums, DbModels } from '../../shared/types/model.types';
import { CrudResponse } from '../../shared/utils/response/response.utils';
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
  UserReviewsResponse,
  UserResponse,
  UserWithPassword,
} from './user.types';
import {
  isForeignKeyConstraintError,
  USER_RESPONSE_MESSAGES,
} from './utils/user.utils';

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

  async findMe(userId: string): Promise<UserResponse> {
    const dbUser = await this.findActiveUserById(userId);

    return CrudResponse(DbModels.USER, CrudEnums.READ, dbUser);
  }

  async updateMe(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
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
    userId: string,
    updateUserPasswordDto: UpdateUserPasswordDto,
  ): Promise<UserMessageResponse> {
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
    userId: string,
    createUserReviewDto: CreateUserReviewDto,
  ): Promise<UserReviewResponse> {
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

  async findMyReviews(userId: string): Promise<UserReviewsResponse> {
    await this.findActiveUserById(userId);

    const reviews = await this.prismaService.company_review.findMany({
      where: { author_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.READ, reviews);
  }

  async findMyReview(
    userId: string,
    reviewId: string,
  ): Promise<UserReviewResponse> {
    await this.findActiveUserById(userId);
    const review = await this.findOwnedReviewOrThrow(userId, reviewId);

    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.READ, review);
  }

  async updateMyReview(
    userId: string,
    reviewId: string,
    updateUserReviewDto: UpdateUserReviewDto,
  ): Promise<UserReviewResponse> {
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
    userId: string,
    reviewId: string,
  ): Promise<UserMessageResponse> {
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

  async removeMe(userId: string): Promise<UserMessageResponse> {
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

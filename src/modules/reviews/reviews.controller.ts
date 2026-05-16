import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { SkipAuth } from '../auth/decorators/skip-auth.decorator';
import { User } from '../auth/decorators/user.decorator';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import { BaseQueryDto } from '@shared/dtos';

@ApiTags('reviews')
@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a company' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({
    status: 422,
    description: 'Location does not belong to this company',
  })
  create(
    @User() user: AuthenticatedRequest['user'],
    @Param('companyId') companyId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user, companyId, dto);
  }

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'Get all published reviews for a company' })
  @ApiResponse({ status: 200, description: 'Return all reviews' })
  findAll(@Param('companyId') companyId: string, @Query() query: BaseQueryDto) {
    return this.reviewsService.findAll(companyId, query);
  }

  @Get(':reviewId')
  @SkipAuth()
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiResponse({ status: 200, description: 'Return a single review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(
    @Param('companyId') companyId: string,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.findOne(companyId, reviewId);
  }

  @Patch(':reviewId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  update(
    @User() user: AuthenticatedRequest['user'],
    @Param('companyId') companyId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(user, companyId, reviewId, dto);
  }

  @Delete(':reviewId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  remove(
    @User() user: AuthenticatedRequest['user'],
    @Param('companyId') companyId: string,
    @Param('reviewId') reviewId: string,
  ) {
    return this.reviewsService.remove(user, companyId, reviewId);
  }
}

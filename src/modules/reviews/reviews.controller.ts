import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import type { ApiSuccessResponse } from '../../shared/utils/response';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BaseQueryDto } from '@shared/dtos/base-query.dto';

@ApiTags('reviews')
@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(
    @Body() createReviewDto: CreateReviewDto,
  ): ApiSuccessResponse<CreateReviewDto> {
    return this.reviewsService.create(createReviewDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiResponse({ status: 200, description: 'Return all reviews' })
  findAll(@Query() query: BaseQueryDto): ApiSuccessResponse<string[]> {
    return this.reviewsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiResponse({ status: 200, description: 'Return a single review' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id') id: string): ApiSuccessResponse<string> {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ): ApiSuccessResponse<{ id: string; review: UpdateReviewDto }> {
    return this.reviewsService.update(id, updateReviewDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  remove(@Param('id') id: string): ApiSuccessResponse<string> {
    return this.reviewsService.remove(id);
  }
}

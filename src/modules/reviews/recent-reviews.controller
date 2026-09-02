import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class RecentReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @SkipAuth()
  @Get('recent')
  @ApiOperation({ summary: 'Get recent published reviews' })
  async getRecentReviews(@Query('limit') limit = 6) {
    return this.reviewsService.findRecent(Number(limit));
  }
}

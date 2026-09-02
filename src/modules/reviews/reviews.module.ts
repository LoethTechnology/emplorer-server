import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { RecentReviewsController } from './recent-reviews.controller';

@Module({
  controllers: [ReviewsController, RecentReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}

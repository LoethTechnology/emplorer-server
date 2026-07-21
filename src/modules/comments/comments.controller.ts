import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EmailVerifiedGuard, JwtAuthGuard } from '../auth/guards';
import { SkipAuth } from '../auth/decorators/skip-auth.decorator';
import { User } from '../auth/decorators/user.decorator';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto, VoteCommentDto } from './dto';
import { BaseQueryDto } from '@shared/dtos';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import type {
  ReviewComment,
  ReviewCommentResponse,
  CommentVoteResponse,
} from './comments.types';
import type { PaginationResponseInterface } from '@shared/types';

@ApiTags('comments')
@Controller('reviews/:reviewId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(EmailVerifiedGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to a review' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({
    status: 422,
    description: 'Parent comment not found or does not belong to this review',
  })
  create(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<ReviewCommentResponse> {
    return this.commentsService.create(user, reviewId, dto);
  }

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'List top-level comments for a review' })
  @ApiResponse({
    status: 200,
    description: 'Return a paginated list of comments with replies',
  })
  findAll(
    @Param('reviewId') reviewId: string,
    @Query() query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<ReviewComment>> {
    return this.commentsService.findAll(reviewId, query);
  }

  @Get(':commentId')
  @SkipAuth()
  @ApiOperation({ summary: 'Get a single comment with its replies' })
  @ApiResponse({ status: 200, description: 'Return a single comment' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  findOne(
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
  ): Promise<ReviewCommentResponse> {
    return this.commentsService.findOne(reviewId, commentId);
  }

  @Patch(':commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  update(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<ReviewCommentResponse> {
    return this.commentsService.update(user, reviewId, commentId, dto);
  }

  @Delete(':commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment (soft delete)' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  remove(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
  ): Promise<ReviewCommentResponse> {
    return this.commentsService.remove(user, reviewId, commentId);
  }

  @Post(':commentId/votes')
  @UseGuards(EmailVerifiedGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cast or update a vote on a comment' })
  @ApiResponse({ status: 201, description: 'Vote recorded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  castVote(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
    @Body() dto: VoteCommentDto,
  ): Promise<CommentVoteResponse> {
    return this.commentsService.castVote(user, reviewId, commentId, dto);
  }

  @Delete(':commentId/votes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a vote from a comment' })
  @ApiResponse({ status: 200, description: 'Vote removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Vote not found' })
  removeVote(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
  ): Promise<CommentVoteResponse> {
    return this.commentsService.removeVote(user, reviewId, commentId);
  }
}

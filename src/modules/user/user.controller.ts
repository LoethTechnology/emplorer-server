import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import {
  CreateUserDto,
  CreateUserReviewDto,
  UpdateUserDto,
  UpdateUserPasswordDto,
  UpdateUserReviewDto,
} from './dto';
import { UserService } from './user.service';
import type {
  AuthenticatedRequest,
  UserMessageResponse,
  UserReviewResponse,
  UserResponse,
  UserReview,
} from './user.types';
import { BaseQueryDto } from '@shared/dtos';
import { User } from '@modules/auth/decorators/user.decorator';
import { SkipAuth } from '@modules/auth/decorators/skip-auth.decorator';
import { PaginationResponseInterface } from '@shared/index';

@ApiTags('user')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @SkipAuth()
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User account created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User account already exists' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.userService.create(createUserDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user account' })
  @ApiResponse({ status: 200, description: 'Return the current user account' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  findMe(@User() user: AuthenticatedRequest['user']): Promise<UserResponse> {
    return this.userService.findMe(user);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user account' })
  @ApiResponse({
    status: 200,
    description: 'User account updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  updateMe(
    @User() user: AuthenticatedRequest['user'],
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.userService.updateMe(user, updateUserDto);
  }

  @Patch('password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password change request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  updatePassword(
    @User() user: AuthenticatedRequest['user'],
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
  ): Promise<UserMessageResponse> {
    return this.userService.updatePassword(user, updateUserPasswordDto);
  }

  @Post('me/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for the current user' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or company not found' })
  createMyReview(
    @User() user: AuthenticatedRequest['user'],
    @Body() createUserReviewDto: CreateUserReviewDto,
  ): Promise<UserReviewResponse> {
    return this.userService.createMyReview(user, createUserReviewDto);
  }

  @Get('me/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reviews created by the current user' })
  @ApiResponse({ status: 200, description: 'Return the current user reviews' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  findMyReviews(
    @User() user: AuthenticatedRequest['user'],
    @Query() query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<UserReview>> {
    return this.userService.findMyReviews(user, query);
  }

  @Get('me/reviews/:reviewId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one review created by the current user' })
  @ApiResponse({ status: 200, description: 'Return the requested review' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or review not found' })
  findMyReview(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
  ): Promise<UserReviewResponse> {
    return this.userService.findMyReview(user, reviewId);
  }

  @Patch('me/reviews/:reviewId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review created by the current user' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or review not found' })
  updateMyReview(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Body() updateUserReviewDto: UpdateUserReviewDto,
  ): Promise<UserReviewResponse> {
    return this.userService.updateMyReview(user, reviewId, updateUserReviewDto);
  }

  @Delete('me/reviews/:reviewId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review created by the current user' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or review not found' })
  removeMyReview(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
  ): Promise<UserMessageResponse> {
    return this.userService.removeMyReview(user, reviewId);
  }

  @Delete('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the current user account' })
  @ApiResponse({
    status: 200,
    description: 'User account deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  @ApiResponse({ status: 409, description: 'User account deletion is blocked' })
  removeMe(
    @User() user: AuthenticatedRequest['user'],
  ): Promise<UserMessageResponse> {
    return this.userService.removeMe(user);
  }
}

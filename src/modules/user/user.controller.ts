import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserReviewDto } from './dto/update-user-review.dto';
import { UserService } from './user.service';
import type {
  AuthenticatedRequest,
  UserMessageResponse,
  UserReviewResponse,
  UserReviewsResponse,
  UserResponse,
} from './user.types';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user account' })
  @ApiResponse({ status: 200, description: 'Return the current user account' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  findMe(@Req() req: AuthenticatedRequest): Promise<UserResponse> {
    return this.userService.findMe(req.user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
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
    @Req() req: AuthenticatedRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.userService.updateMe(req.user.sub, updateUserDto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password change request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  updatePassword(
    @Req() req: AuthenticatedRequest,
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
  ): Promise<UserMessageResponse> {
    return this.userService.updatePassword(req.user.sub, updateUserPasswordDto);
  }

  @Post('me/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for the current user' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or company not found' })
  createMyReview(
    @Req() req: AuthenticatedRequest,
    @Body() createUserReviewDto: CreateUserReviewDto,
  ): Promise<UserReviewResponse> {
    return this.userService.createMyReview(req.user.sub, createUserReviewDto);
  }

  @Get('me/reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reviews created by the current user' })
  @ApiResponse({ status: 200, description: 'Return the current user reviews' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  findMyReviews(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserReviewsResponse> {
    return this.userService.findMyReviews(req.user.sub);
  }

  @Get('me/reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one review created by the current user' })
  @ApiResponse({ status: 200, description: 'Return the requested review' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or review not found' })
  findMyReview(
    @Req() req: AuthenticatedRequest,
    @Param('reviewId') reviewId: string,
  ): Promise<UserReviewResponse> {
    return this.userService.findMyReview(req.user.sub, reviewId);
  }

  @Patch('me/reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review created by the current user' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or review not found' })
  updateMyReview(
    @Req() req: AuthenticatedRequest,
    @Param('reviewId') reviewId: string,
    @Body() updateUserReviewDto: UpdateUserReviewDto,
  ): Promise<UserReviewResponse> {
    return this.userService.updateMyReview(
      req.user.sub,
      reviewId,
      updateUserReviewDto,
    );
  }

  @Delete('me/reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review created by the current user' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User or review not found' })
  removeMyReview(
    @Req() req: AuthenticatedRequest,
    @Param('reviewId') reviewId: string,
  ): Promise<UserMessageResponse> {
    return this.userService.removeMyReview(req.user.sub, reviewId);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the current user account' })
  @ApiResponse({
    status: 200,
    description: 'User account deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User account not found' })
  @ApiResponse({ status: 409, description: 'User account deletion is blocked' })
  removeMe(@Req() req: AuthenticatedRequest): Promise<UserMessageResponse> {
    return this.userService.removeMe(req.user.sub);
  }
}

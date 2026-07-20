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
import { CritiquesService } from './critiques.service';
import { CreateCritiqueDto, UpdateCritiqueDto } from './dto';
import { BaseQueryDto } from '@shared/dtos';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import type { ReviewCritique, ReviewCritiqueResponse } from './critiques.types';
import type { PaginationResponseInterface } from '@shared/types';

@ApiTags('critiques')
@Controller('reviews/:reviewId/critiques')
@UseGuards(JwtAuthGuard)
export class CritiquesController {
  constructor(private readonly critiquesService: CritiquesService) {}

  @Post()
  @UseGuards(EmailVerifiedGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a critique to a review' })
  @ApiResponse({ status: 201, description: 'Critique created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  create(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateCritiqueDto,
  ): Promise<ReviewCritiqueResponse> {
    return this.critiquesService.create(user, reviewId, dto);
  }

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'List all critiques for a review' })
  @ApiResponse({
    status: 200,
    description: 'Return a paginated list of critiques',
  })
  findAll(
    @Param('reviewId') reviewId: string,
    @Query() query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<ReviewCritique>> {
    return this.critiquesService.findAll(reviewId, query);
  }

  @Get(':critiqueId')
  @SkipAuth()
  @ApiOperation({ summary: 'Get a single critique' })
  @ApiResponse({ status: 200, description: 'Return a single critique' })
  @ApiResponse({ status: 404, description: 'Critique not found' })
  findOne(
    @Param('reviewId') reviewId: string,
    @Param('critiqueId') critiqueId: string,
  ): Promise<ReviewCritiqueResponse> {
    return this.critiquesService.findOne(reviewId, critiqueId);
  }

  @Patch(':critiqueId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a critique' })
  @ApiResponse({ status: 200, description: 'Critique updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Critique not found' })
  update(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Param('critiqueId') critiqueId: string,
    @Body() dto: UpdateCritiqueDto,
  ): Promise<ReviewCritiqueResponse> {
    return this.critiquesService.update(user, reviewId, critiqueId, dto);
  }

  @Delete(':critiqueId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a critique' })
  @ApiResponse({ status: 200, description: 'Critique deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Critique not found' })
  remove(
    @User() user: AuthenticatedRequest['user'],
    @Param('reviewId') reviewId: string,
    @Param('critiqueId') critiqueId: string,
  ): Promise<ReviewCritiqueResponse> {
    return this.critiquesService.remove(user, reviewId, critiqueId);
  }
}

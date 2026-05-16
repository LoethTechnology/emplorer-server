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
import { JwtAuthGuard } from '../auth/guards';
import { SkipAuth } from '../auth/decorators/skip-auth.decorator';
import { User } from '../auth/decorators/user.decorator';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import type {
  CompanyLocation,
  CompanyLocationResponse,
} from './locations.types';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import type { PaginationResponseInterface } from '@shared/types';
import { BaseQueryDto } from '@shared/dtos';

@ApiTags('locations')
@Controller('companies/:companyId/locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a location to a company' })
  @ApiResponse({ status: 201, description: 'Location created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  create(
    @User() user: AuthenticatedRequest['user'],
    @Param('companyId') companyId: string,
    @Body() dto: CreateLocationDto,
  ): Promise<CompanyLocationResponse> {
    return this.locationsService.create(user, companyId, dto);
  }

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'List all locations for a company' })
  @ApiResponse({
    status: 200,
    description: 'Return a paginated list of locations',
  })
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<CompanyLocation>> {
    return this.locationsService.findAll(companyId, query);
  }

  @Get(':locationId')
  @SkipAuth()
  @ApiOperation({ summary: 'Get a single location' })
  @ApiResponse({ status: 200, description: 'Return a single location' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  findOne(
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
  ): Promise<CompanyLocationResponse> {
    return this.locationsService.findOne(companyId, locationId);
  }

  @Patch(':locationId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a company location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  update(
    @User() user: AuthenticatedRequest['user'],
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<CompanyLocationResponse> {
    return this.locationsService.update(user, companyId, locationId, dto);
  }

  @Delete(':locationId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a company location' })
  @ApiResponse({ status: 200, description: 'Location deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Location not found' })
  remove(
    @User() user: AuthenticatedRequest['user'],
    @Param('companyId') companyId: string,
    @Param('locationId') locationId: string,
  ): Promise<CompanyLocationResponse> {
    return this.locationsService.remove(user, companyId, locationId);
  }
}

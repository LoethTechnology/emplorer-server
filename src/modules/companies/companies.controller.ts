import {
  Body,
  Controller,
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
import { CompaniesService } from './companies.service';
import { CompanyQueryDto, CreateCompanyDto, UpdateCompanyDto } from './dto';
import type { Company, CompanyResponse } from './companies.types';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import type { PaginationResponseInterface } from '@shared/types';

@ApiTags('companies')
@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'A company with this domain already exists',
  })
  create(
    @User() user: AuthenticatedRequest['user'],
    @Body() createCompanyDto: CreateCompanyDto,
  ): Promise<CompanyResponse> {
    return this.companiesService.create(user, createCompanyDto);
  }

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'List approved companies' })
  @ApiResponse({
    status: 200,
    description: 'Return a paginated list of approved companies',
  })
  findAll(
    @Query() query: CompanyQueryDto,
  ): Promise<PaginationResponseInterface<Company>> {
    return this.companiesService.findAll(query);
  }

  @Get('domain/:domain')
  @SkipAuth()
  @ApiOperation({ summary: 'Find an approved company by domain' })
  @ApiResponse({ status: 200, description: 'Return the matching company' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findByDomain(@Param('domain') domain: string): Promise<CompanyResponse> {
    return this.companiesService.findByDomain(domain);
  }

  @Get(':id')
  @SkipAuth()
  @ApiOperation({ summary: 'Get an approved company by ID' })
  @ApiResponse({ status: 200, description: 'Return a single company' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id') id: string): Promise<CompanyResponse> {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a company that the current user created' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  update(
    @User() user: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<CompanyResponse> {
    return this.companiesService.update(user, id, updateCompanyDto);
  }
}

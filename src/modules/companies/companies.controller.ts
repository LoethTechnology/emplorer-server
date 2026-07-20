import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmailVerifiedGuard, JwtAuthGuard } from '../auth/guards';
import { SkipAuth } from '../auth/decorators/skip-auth.decorator';
import { User } from '../auth/decorators/user.decorator';
import { CompaniesService } from './companies.service';
import { CompanyQueryDto, CreateCompanyDto, UpdateCompanyDto } from './dto';
import type {
  Company,
  CompanyResponse,
  CompanyTypeaheadResponse,
} from './companies.types';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import type { PaginationResponseInterface } from '@shared/types';

@ApiTags('companies')
@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @UseGuards(EmailVerifiedGuard)
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

  @Get('typeahead')
  @SkipAuth()
  @ApiOperation({ summary: 'Typeahead search for companies by name' })
  @ApiResponse({
    status: 200,
    description: 'Return up to 10 matching companies with their locations',
  })
  @ApiResponse({ status: 400, description: 'Query parameter q is required' })
  async typeahead(@Query('q') q: string): Promise<CompanyTypeaheadResponse> {
    if (!q?.trim()) {
      throw new BadRequestException('Query parameter "q" is required.');
    }
    return this.companiesService.typeahead(q);
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

  @Post(':id/logo')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload or replace the logo for a company' })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  uploadLogo(
    @User() user: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<CompanyResponse> {
    return this.companiesService.uploadLogo(user, id, file);
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

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { PublicCompanyQueryDto } from './dto/public-company-query.dto';
import { SkipAuth } from '../auth/decorators/skip-auth.decorator';
import { BaseQueryDto } from '@shared/dtos';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('companies')
  @SkipAuth()
  @ApiOperation({ summary: 'List approved companies with review stats' })
  @ApiResponse({
    status: 200,
    description:
      'Returns a paginated list of approved companies with locations, total reviews, and mean rating',
  })
  findCompanies(@Query() query: PublicCompanyQueryDto) {
    return this.publicService.findCompanies(query);
  }

  @Get('companies/:companyId/reviews')
  @SkipAuth()
  @ApiOperation({ summary: 'Get published reviews for a company' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated published reviews for the given company',
  })
  findCompanyReviews(
    @Param('companyId') companyId: string,
    @Query() query: BaseQueryDto,
  ) {
    return this.publicService.findCompanyReviews(companyId, query);
  }
}

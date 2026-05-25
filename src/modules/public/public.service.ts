import { Injectable } from '@nestjs/common';
import { Prisma } from 'prisma/generated/prisma/client';
import { CompanyStatus, ReviewStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import { PaginationResponseInterface } from '../../shared/types';
import { GetPageOptions, PaginateRes } from '@shared/index';
import { BaseQueryDto } from '@shared/dtos';
import type { PublicCompanyItem } from './public.types';
import type { PublicCompanyQueryDto } from './dto/public-company-query.dto';
import type { company_review } from 'prisma/generated/prisma/client';

@Injectable()
export class PublicService {
  constructor(private readonly prismaService: PrismaService) {}

  async findCompanies(
    query: PublicCompanyQueryDto,
  ): Promise<PaginationResponseInterface<PublicCompanyItem>> {
    const { page, limit, sort, name, location, rating } = query;

    const where: Prisma.companyWhereInput = {
      status: CompanyStatus.APPROVED,
      ...(name && { name: { contains: name, mode: 'insensitive' } }),
      ...(location && {
        locations: {
          some: {
            OR: [
              { city: { contains: location, mode: 'insensitive' } },
              { state: { contains: location, mode: 'insensitive' } },
              { country: { contains: location, mode: 'insensitive' } },
            ],
          },
        },
      }),
    };

    if (rating) {
      const groups = await this.prismaService.company_review.groupBy({
        by: ['company_id'],
        where: { status: ReviewStatus.PUBLISHED },
        having: { overall_rating: { _avg: { gte: rating } } },
        _avg: { overall_rating: true },
      });
      where.id = { in: groups.map((g) => g.company_id) };
    }

    const [count, companies] = await Promise.all([
      this.prismaService.company.count({ where }),
      this.prismaService.company.findMany({
        ...GetPageOptions(Number(page), Number(limit)),
        where,
        select: {
          id: true,
          name: true,
          logo_url: true,
          locations: {
            select: {
              id: true,
              city: true,
              state: true,
              country: true,
              is_headquarters: true,
            },
            orderBy: { is_headquarters: 'desc' },
          },
          _count: {
            select: {
              reviews: { where: { status: ReviewStatus.PUBLISHED } },
            },
          },
        },
        orderBy: { created_at: sort ?? 'desc' },
      }),
    ]);

    const companyIds = companies.map((c) => c.id);
    const ratingAggregates = await this.prismaService.company_review.groupBy({
      by: ['company_id'],
      where: { company_id: { in: companyIds }, status: ReviewStatus.PUBLISHED },
      _avg: { overall_rating: true },
    });
    const ratingMap = new Map(
      ratingAggregates.map((r) => [r.company_id, r._avg.overall_rating]),
    );

    const records: PublicCompanyItem[] = companies.map((c) => ({
      id: c.id,
      name: c.name,
      logo_url: c.logo_url,
      locations: c.locations,
      total_reviews: c._count.reviews,
      mean_rating: ratingMap.get(c.id) ?? null,
    }));

    return PaginateRes(
      records,
      count,
      records.length,
      Number(page),
      Number(limit),
    );
  }

  async findCompanyReviews(
    companyId: string,
    query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<company_review>> {
    const { page, limit, sort } = query;

    const where = {
      company_id: companyId,
      status: ReviewStatus.PUBLISHED,
    };

    const [count, records] = await Promise.all([
      this.prismaService.company_review.count({ where }),
      this.prismaService.company_review.findMany({
        ...GetPageOptions(Number(page), Number(limit)),
        where,
        orderBy: { published_at: sort ?? 'desc' },
      }),
    ]);

    return PaginateRes(
      records,
      count,
      records.length,
      Number(page),
      Number(limit),
    );
  }
}

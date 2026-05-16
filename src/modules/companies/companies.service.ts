import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import {
  CrudEnums,
  DbModels,
  PaginationResponseInterface,
} from '../../shared/types';
import { CrudResponse } from '../../shared/utils/response';
import { GetPageOptions, PaginateRes } from '@shared/index';
import type { AuthenticatedRequest } from '@modules/user/user.types';
import type {
  CompanyQueryDto,
  CreateCompanyDto,
  UpdateCompanyDto,
} from './dto';
import type { Company, CompanyResponse } from './companies.types';
import { COMPANIES_RESPONSE_MESSAGES } from './utils/companies.utils';

@Injectable()
export class CompaniesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    user: AuthenticatedRequest['user'],
    createCompanyDto: CreateCompanyDto,
  ): Promise<CompanyResponse> {
    if (createCompanyDto.domain) {
      const existing = await this.prismaService.company.findUnique({
        where: { domain: createCompanyDto.domain },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException(
          COMPANIES_RESPONSE_MESSAGES.domainAlreadyInUse,
        );
      }
    }

    const created = await this.prismaService.company.create({
      data: {
        creator_id: user.sub,
        name: createCompanyDto.name,
        description: createCompanyDto.description ?? null,
        website_url: createCompanyDto.website_url ?? null,
        domain: createCompanyDto.domain ?? null,
        linkedin_url: createCompanyDto.linkedin_url ?? null,
        logo_url: createCompanyDto.logo_url ?? null,
        headquarters: createCompanyDto.headquarters ?? null,
        industry: createCompanyDto.industry ?? null,
      },
    });

    return CrudResponse(DbModels.COMPANY, CrudEnums.CREATE, created);
  }

  async findAll(
    query: CompanyQueryDto,
  ): Promise<PaginationResponseInterface<Company>> {
    const { page, limit, search, sort, industry } = query;

    const where = {
      status: CompanyStatus.APPROVED,
      ...(industry && { industry }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [count, records] = await Promise.all([
      this.prismaService.company.count({ where }),
      this.prismaService.company.findMany({
        ...GetPageOptions(Number(page), Number(limit)),
        where,
        orderBy: { created_at: sort || 'desc' },
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

  async findOne(id: string): Promise<CompanyResponse> {
    const company = await this.findApprovedCompanyOrThrow(id);

    return CrudResponse(DbModels.COMPANY, CrudEnums.READ, company);
  }

  async findByDomain(domain: string): Promise<CompanyResponse> {
    const company = await this.prismaService.company.findFirst({
      where: {
        domain,
        status: CompanyStatus.APPROVED,
      },
    });

    if (!company) {
      throw new NotFoundException(COMPANIES_RESPONSE_MESSAGES.companyNotFound);
    }

    return CrudResponse(DbModels.COMPANY, CrudEnums.READ, company);
  }

  async update(
    user: AuthenticatedRequest['user'],
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<CompanyResponse> {
    const existing = await this.findCompanyOrThrow(id);

    if (existing.creator_id !== user.sub) {
      throw new ForbiddenException(
        COMPANIES_RESPONSE_MESSAGES.companyForbidden,
      );
    }

    const updated = await this.prismaService.company.update({
      where: { id },
      data: {
        description: updateCompanyDto.description ?? existing.description,
        website_url: updateCompanyDto.website_url ?? existing.website_url,
        linkedin_url: updateCompanyDto.linkedin_url ?? existing.linkedin_url,
        logo_url: updateCompanyDto.logo_url ?? existing.logo_url,
        headquarters: updateCompanyDto.headquarters ?? existing.headquarters,
        industry: updateCompanyDto.industry ?? existing.industry,
      },
    });

    return CrudResponse(DbModels.COMPANY, CrudEnums.UPDATE, updated);
  }

  private async findApprovedCompanyOrThrow(id: string): Promise<Company> {
    const company = await this.prismaService.company.findFirst({
      where: {
        id,
        status: CompanyStatus.APPROVED,
      },
    });

    if (!company) {
      throw new NotFoundException(COMPANIES_RESPONSE_MESSAGES.companyNotFound);
    }

    return company;
  }

  private async findCompanyOrThrow(id: string): Promise<Company> {
    const company = await this.prismaService.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException(COMPANIES_RESPONSE_MESSAGES.companyNotFound);
    }

    return company;
  }
}

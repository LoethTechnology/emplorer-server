import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import { MailService } from '../../shared/modules/mail';
import { CloudinaryService } from '../../shared/modules/cloudinary';
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
import type {
  Company,
  CompanyResponse,
  CompanyTypeaheadItem,
  CompanyTypeaheadResponse,
} from './companies.types';
import { COMPANIES_RESPONSE_MESSAGES } from './utils/companies.utils';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    user: AuthenticatedRequest['user'],
    createCompanyDto: CreateCompanyDto,
    file?: Express.Multer.File,
  ): Promise<CompanyResponse> {
    const created = await this.prismaService.company.create({
      data: {
        creator_id: user.sub,
        name: createCompanyDto.name,
        description: createCompanyDto.description ?? null,
        website_url: createCompanyDto.website_url ?? null,
        linkedin_url: createCompanyDto.linkedin_url ?? null,
        logo_url: null,
        industry: createCompanyDto.industry ?? null,
        status: CompanyStatus.APPROVED,
        locations: {
          create: {
            address: createCompanyDto.address,
            country: createCompanyDto.country ?? null,
            is_headquarters: true,
          },
        },
      },
    });

    const company = file
      ? await this.saveLogoForCompany(created.id, file)
      : created;

    this.prismaService.user
      .findUnique({
        where: { id: user.sub },
        select: { email: true, first_name: true },
      })
      .then((creator) => {
        if (creator?.email) {
          this.mailService
            .sendCompanySubmittedEmail(
              creator.email,
              creator.first_name,
              company.name,
            )
            .catch(() => {});
        }
      })
      .catch(() => {});

    return CrudResponse(DbModels.COMPANY, CrudEnums.CREATE, company);
  }

  async typeahead(q: string): Promise<CompanyTypeaheadResponse> {
    const results = await this.prismaService.company.findMany({
      where: {
        status: CompanyStatus.APPROVED,
        name: { startsWith: q.trim(), mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        logo_url: true,
        locations: {
          select: {
            address: true,
            country: true,
            is_headquarters: true,
          },
          orderBy: { is_headquarters: 'desc' },
        },
      },
      take: 10,
      orderBy: { name: 'asc' },
    });

    return CrudResponse(
      DbModels.COMPANY,
      CrudEnums.READ,
      results as CompanyTypeaheadItem[],
    );
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

  async uploadLogo(
    user: AuthenticatedRequest['user'],
    id: string,
    file: Express.Multer.File,
  ): Promise<CompanyResponse> {
    const existing = await this.findCompanyOrThrow(id);

    if (existing.creator_id !== user.sub) {
      throw new ForbiddenException(
        COMPANIES_RESPONSE_MESSAGES.companyForbidden,
      );
    }

    const publicId = `emplorer/companies/${id}/logo`;

    if (existing.logo_url) {
      await this.cloudinaryService.deleteImage(publicId).catch(() => {});
    }

    const updated = await this.saveLogoForCompany(id, file);

    return CrudResponse(DbModels.COMPANY, CrudEnums.UPDATE, updated);
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

  private async saveLogoForCompany(
    id: string,
    file: Express.Multer.File,
  ): Promise<Company> {
    const publicId = `emplorer/companies/${id}/logo`;
    const result = await this.cloudinaryService.uploadImage(file, publicId);

    return this.prismaService.company.update({
      where: { id },
      data: { logo_url: result.secure_url },
    });
  }
}

import {
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
import type { CreateLocationDto, UpdateLocationDto } from './dto';
import type {
  CompanyLocation,
  CompanyLocationResponse,
} from './locations.types';
import { LOCATIONS_RESPONSE_MESSAGES } from './utils/locations.utils';
import { BaseQueryDto } from '@shared/dtos';

@Injectable()
export class LocationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    user: AuthenticatedRequest['user'],
    companyId: string,
    dto: CreateLocationDto,
  ): Promise<CompanyLocationResponse> {
    await this.findOwnedCompanyOrThrow(user.sub, companyId);

    const location = await this.prismaService.company_location.create({
      data: {
        company_id: companyId,
        city: dto.city,
        state: dto.state ?? null,
        country: dto.country,
        address: dto.address ?? null,
        is_headquarters: dto.is_headquarters ?? false,
      },
    });

    return CrudResponse(DbModels.COMPANY_LOCATION, CrudEnums.CREATE, location);
  }

  async findAll(
    companyId: string,
    query: BaseQueryDto,
  ): Promise<PaginationResponseInterface<CompanyLocation>> {
    const { page, limit, sort } = query;

    const where = { company_id: companyId };

    const [count, records] = await Promise.all([
      this.prismaService.company_location.count({ where }),
      this.prismaService.company_location.findMany({
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

  async findOne(
    companyId: string,
    locationId: string,
  ): Promise<CompanyLocationResponse> {
    const location = await this.findLocationOrThrow(companyId, locationId);
    return CrudResponse(DbModels.COMPANY_LOCATION, CrudEnums.READ, location);
  }

  async update(
    user: AuthenticatedRequest['user'],
    companyId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ): Promise<CompanyLocationResponse> {
    await this.findOwnedCompanyOrThrow(user.sub, companyId);
    const existing = await this.findLocationOrThrow(companyId, locationId);

    const updated = await this.prismaService.company_location.update({
      where: { id: existing.id },
      data: {
        city: dto.city ?? existing.city,
        state: dto.state !== undefined ? dto.state : existing.state,
        country: dto.country ?? existing.country,
        address: dto.address !== undefined ? dto.address : existing.address,
        is_headquarters:
          dto.is_headquarters !== undefined
            ? dto.is_headquarters
            : existing.is_headquarters,
      },
    });

    return CrudResponse(DbModels.COMPANY_LOCATION, CrudEnums.UPDATE, updated);
  }

  async remove(
    user: AuthenticatedRequest['user'],
    companyId: string,
    locationId: string,
  ): Promise<CompanyLocationResponse> {
    await this.findOwnedCompanyOrThrow(user.sub, companyId);
    const existing = await this.findLocationOrThrow(companyId, locationId);

    const deleted = await this.prismaService.company_location.delete({
      where: { id: existing.id },
    });

    return CrudResponse(DbModels.COMPANY_LOCATION, CrudEnums.DELETE, deleted);
  }

  private async findOwnedCompanyOrThrow(userId: string, companyId: string) {
    const company = await this.prismaService.company.findFirst({
      where: { id: companyId, status: CompanyStatus.APPROVED },
      select: { id: true, creator_id: true },
    });

    if (!company) {
      throw new NotFoundException(LOCATIONS_RESPONSE_MESSAGES.companyNotFound);
    }

    if (company.creator_id !== userId) {
      throw new ForbiddenException(
        LOCATIONS_RESPONSE_MESSAGES.locationForbidden,
      );
    }

    return company;
  }

  private async findLocationOrThrow(
    companyId: string,
    locationId: string,
  ): Promise<CompanyLocation> {
    const location = await this.prismaService.company_location.findFirst({
      where: { id: locationId, company_id: companyId },
    });

    if (!location) {
      throw new NotFoundException(LOCATIONS_RESPONSE_MESSAGES.locationNotFound);
    }

    return location;
  }
}

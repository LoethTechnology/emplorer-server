import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import { CompaniesService } from './companies.service';
import type { AuthenticatedRequest } from '@modules/user/user.types';

jest.mock('../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

const mockPrismaService = {
  company: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockAuthenticatedUser = (sub: string): AuthenticatedRequest['user'] => ({
  sub,
});

const approvedCompany = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'company-1',
  creator_id: 'user-1',
  name: 'Acme Inc.',
  description: null,
  website_url: null,
  domain: 'acme.com',
  linkedin_url: null,
  logo_url: null,
  headquarters: null,
  industry: 'Technology',
  status: CompanyStatus.APPROVED,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('CompaniesService', () => {
  let service: CompaniesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a company with PENDING status and the authenticated creator', async () => {
      mockPrismaService.company.create.mockResolvedValue(
        approvedCompany({ status: CompanyStatus.PENDING }),
      );

      const result = await service.create(mockAuthenticatedUser('user-1'), {
        name: 'Acme Inc.',
        domain: 'acme.com',
      });

      expect(mockPrismaService.company.findUnique).toHaveBeenCalledWith({
        where: { domain: 'acme.com' },
        select: { id: true },
      });
      expect(mockPrismaService.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          creator_id: 'user-1',
          name: 'Acme Inc.',
          domain: 'acme.com',
        }),
      });
      expect(result).toEqual({
        message: 'Company created successfully.',
        code: HttpStatus.CREATED,
        data: expect.objectContaining({ id: 'company-1' }),
      });
    });

    it('should reject a duplicate domain', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        id: 'existing-company',
      });

      await expect(
        service.create(mockAuthenticatedUser('user-1'), {
          name: 'Acme Inc.',
          domain: 'acme.com',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mockPrismaService.company.create).not.toHaveBeenCalled();
    });

    it('should skip the domain uniqueness check when no domain is provided', async () => {
      mockPrismaService.company.create.mockResolvedValue(
        approvedCompany({ domain: null }),
      );

      await service.create(mockAuthenticatedUser('user-1'), {
        name: 'Acme Inc.',
      });

      expect(mockPrismaService.company.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.company.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of approved companies', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([approvedCompany()]);
      mockPrismaService.company.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(mockPrismaService.company.count).toHaveBeenCalledWith({
        where: { status: CompanyStatus.APPROVED },
      });
      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'company-1' }),
        ]),
        totalCount: 1,
        limit: 10,
        currentCount: 1,
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should apply industry and search filters when provided', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      await service.findAll({ search: 'acme', industry: 'Technology' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: CompanyStatus.APPROVED,
            industry: 'Technology',
            name: { contains: 'acme', mode: 'insensitive' },
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an approved company by id', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(approvedCompany());

      const result = await service.findOne('company-1');

      expect(mockPrismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: 'company-1', status: CompanyStatus.APPROVED },
      });
      expect(result).toEqual({
        message: 'Company fetched successfully.',
        code: HttpStatus.OK,
        data: expect.objectContaining({ id: 'company-1' }),
      });
    });

    it('should throw when no approved company matches', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByDomain', () => {
    it('should return an approved company by domain', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(approvedCompany());

      const result = await service.findByDomain('acme.com');

      expect(mockPrismaService.company.findFirst).toHaveBeenCalledWith({
        where: { domain: 'acme.com', status: CompanyStatus.APPROVED },
      });
      expect(result.data).toEqual(expect.objectContaining({ id: 'company-1' }));
    });

    it('should throw when no approved company matches the domain', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(service.findByDomain('unknown.com')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a company owned by the current user', async () => {
      const existing = approvedCompany({ creator_id: 'user-1' });
      mockPrismaService.company.findUnique.mockResolvedValue(existing);
      mockPrismaService.company.update.mockResolvedValue({
        ...existing,
        description: 'Updated description',
      });

      const result = await service.update(
        mockAuthenticatedUser('user-1'),
        'company-1',
        { description: 'Updated description' },
      );

      expect(mockPrismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: expect.objectContaining({ description: 'Updated description' }),
      });
      expect(result.data).toEqual(
        expect.objectContaining({ description: 'Updated description' }),
      );
    });

    it('should reject updates by a user who is not the creator', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(
        approvedCompany({ creator_id: 'another-user' }),
      );

      await expect(
        service.update(mockAuthenticatedUser('user-1'), 'company-1', {
          description: 'Updated description',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrismaService.company.update).not.toHaveBeenCalled();
    });

    it('should throw when the target company does not exist', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockAuthenticatedUser('user-1'), 'missing', {
          description: 'Updated description',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

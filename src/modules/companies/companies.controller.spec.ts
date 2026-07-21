import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/modules/prisma';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import type { AuthenticatedRequest } from '@modules/user/user.types';

jest.mock('../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

const mockAuthenticatedUser = (sub: string): AuthenticatedRequest['user'] => ({
  sub,
});

const mockLogoFile = {
  buffer: Buffer.from('logo'),
  mimetype: 'image/png',
  originalname: 'logo.png',
} as Express.Multer.File;

const mockCompaniesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  typeahead: jest.fn(),
  findOne: jest.fn(),
  uploadLogo: jest.fn(),
  update: jest.fn(),
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('CompaniesController', () => {
  let controller: CompaniesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        { provide: CompaniesService, useValue: mockCompaniesService },
        { provide: PrismaService, useValue: mockPrismaService },
        Reflector,
      ],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to CompaniesService with the authenticated user', async () => {
    const user = mockAuthenticatedUser('user-1');
    const dto = {
      name: 'Acme Inc.',
      address: '14 Admiralty Way, Lekki',
    };

    await controller.create(user, dto);

    expect(mockCompaniesService.create).toHaveBeenCalledWith(
      user,
      dto,
      undefined,
    );
  });

  it('should delegate create to CompaniesService with an uploaded logo file', async () => {
    const user = mockAuthenticatedUser('user-1');
    const dto = {
      name: 'Acme Inc.',
      address: '14 Admiralty Way, Lekki',
    };

    await controller.create(user, dto, mockLogoFile);

    expect(mockCompaniesService.create).toHaveBeenCalledWith(
      user,
      dto,
      mockLogoFile,
    );
  });

  describe('typeahead', () => {
    it('should delegate to CompaniesService with the query string', async () => {
      await controller.typeahead('acme');

      expect(mockCompaniesService.typeahead).toHaveBeenCalledWith('acme');
    });

    it('should throw BadRequestException when q is an empty string', async () => {
      await expect(controller.typeahead('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockCompaniesService.typeahead).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when q is whitespace only', async () => {
      await expect(controller.typeahead('   ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockCompaniesService.typeahead).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when q is undefined', async () => {
      await expect(
        controller.typeahead(undefined as unknown as string),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockCompaniesService.typeahead).not.toHaveBeenCalled();
    });
  });

  it('should delegate findAll to CompaniesService with the query', async () => {
    const query = { page: 1, limit: 10, industry: 'Technology' };

    await controller.findAll(query);

    expect(mockCompaniesService.findAll).toHaveBeenCalledWith(query);
  });

  it('should delegate findOne to CompaniesService with the company id', async () => {
    await controller.findOne('company-1');

    expect(mockCompaniesService.findOne).toHaveBeenCalledWith('company-1');
  });

  it('should delegate update to CompaniesService with the authenticated user and company id', async () => {
    const user = mockAuthenticatedUser('user-2');
    const dto = { description: 'Updated description' };

    await controller.update(user, 'company-1', dto);

    expect(mockCompaniesService.update).toHaveBeenCalledWith(
      user,
      'company-1',
      dto,
    );
  });
});

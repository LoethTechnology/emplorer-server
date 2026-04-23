import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import type { AuthenticatedRequest } from '@modules/user/user.types';

jest.mock('../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

const mockAuthenticatedUser = (sub: string): AuthenticatedRequest['user'] => ({
  sub,
});

const mockCompaniesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByDomain: jest.fn(),
  update: jest.fn(),
};

describe('CompaniesController', () => {
  let controller: CompaniesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        { provide: CompaniesService, useValue: mockCompaniesService },
      ],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to CompaniesService with the authenticated user', async () => {
    const user = mockAuthenticatedUser('user-1');
    const dto = { name: 'Acme Inc.', domain: 'acme.com' };

    await controller.create(user, dto);

    expect(mockCompaniesService.create).toHaveBeenCalledWith(user, dto);
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

  it('should delegate findByDomain to CompaniesService with the domain', async () => {
    await controller.findByDomain('acme.com');

    expect(mockCompaniesService.findByDomain).toHaveBeenCalledWith('acme.com');
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

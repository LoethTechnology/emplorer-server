import { Test, TestingModule } from '@nestjs/testing';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

jest.mock('../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

const mockPublicService = {
  findCompanies: jest.fn(),
  findCompanyReviews: jest.fn(),
};

const paginatedResponse = (data: unknown[] = []) => ({
  data,
  totalCount: data.length,
  currentCount: data.length,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
});

describe('PublicController', () => {
  let controller: PublicController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [{ provide: PublicService, useValue: mockPublicService }],
    }).compile();

    controller = module.get<PublicController>(PublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findCompanies', () => {
    it('should delegate to PublicService with the query', async () => {
      const query = { name: 'Acme', location: 'Lagos', rating: 4 };
      mockPublicService.findCompanies.mockResolvedValue(paginatedResponse());

      await controller.findCompanies(query as any);

      expect(mockPublicService.findCompanies).toHaveBeenCalledWith(query);
    });

    it('should return the service response unchanged', async () => {
      const expected = paginatedResponse([
        { id: 'company-1', name: 'Acme Inc.' },
      ]);
      mockPublicService.findCompanies.mockResolvedValue(expected);

      const result = await controller.findCompanies({} as any);

      expect(result).toBe(expected);
    });

    it('should pass an empty query when no params are provided', async () => {
      mockPublicService.findCompanies.mockResolvedValue(paginatedResponse());

      await controller.findCompanies({} as any);

      expect(mockPublicService.findCompanies).toHaveBeenCalledWith({});
    });
  });

  describe('findCompanyReviews', () => {
    it('should delegate to PublicService with the companyId and query', async () => {
      const query = { page: 1, limit: 5 };
      mockPublicService.findCompanyReviews.mockResolvedValue(
        paginatedResponse(),
      );

      await controller.findCompanyReviews('company-1', query as any);

      expect(mockPublicService.findCompanyReviews).toHaveBeenCalledWith(
        'company-1',
        query,
      );
    });

    it('should return the service response unchanged', async () => {
      const expected = paginatedResponse([
        { id: 'review-1', body: 'Great place.' },
      ]);
      mockPublicService.findCompanyReviews.mockResolvedValue(expected);

      const result = await controller.findCompanyReviews(
        'company-1',
        {} as any,
      );

      expect(result).toBe(expected);
    });

    it('should pass the correct companyId for different companies', async () => {
      mockPublicService.findCompanyReviews.mockResolvedValue(
        paginatedResponse(),
      );

      await controller.findCompanyReviews('company-99', {} as any);

      expect(mockPublicService.findCompanyReviews).toHaveBeenCalledWith(
        'company-99',
        {},
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ReviewStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import { PublicService } from './public.service';

jest.mock('../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

const mockPrismaService = {
  company: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  company_review: {
    groupBy: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockCompany = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'company-1',
  name: 'Acme Inc.',
  logo_url: 'https://cdn.example.com/logo.png',
  locations: [
    {
      id: 'loc-1',
      address: '14 Admiralty Way, Lekki',
      country: 'Nigeria',
      is_headquarters: true,
    },
  ],
  _count: { reviews: 5 },
  ...overrides,
});

const mockReview = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'review-1',
  company_id: 'company-1',
  author_id: 'user-1',
  location_id: null,
  body: 'Great place to work.',
  overall_rating: 4,
  employment_context: 'Full-time',
  would_recommend: true,
  status: ReviewStatus.PUBLISHED,
  published_at: new Date('2024-01-01'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides,
});

describe('PublicService', () => {
  let service: PublicService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findCompanies', () => {
    it('should return a paginated list with locations, total_reviews, and mean_rating', async () => {
      mockPrismaService.company.count.mockResolvedValue(1);
      mockPrismaService.company.findMany.mockResolvedValue([mockCompany()]);
      mockPrismaService.company_review.groupBy.mockResolvedValue([
        { company_id: 'company-1', _avg: { overall_rating: 4.2 } },
      ]);

      const result = await service.findCompanies({});

      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'company-1',
          name: 'Acme Inc.',
          logo_url: 'https://cdn.example.com/logo.png',
          total_reviews: 5,
          mean_rating: 4.2,
          locations: expect.arrayContaining([
            expect.objectContaining({
              address: '14 Admiralty Way, Lekki',
              is_headquarters: true,
            }),
          ]),
        }),
      ]);
      expect(result.totalCount).toBe(1);
    });

    it('should set mean_rating to null when a company has no published reviews', async () => {
      mockPrismaService.company.count.mockResolvedValue(1);
      mockPrismaService.company.findMany.mockResolvedValue([
        mockCompany({ _count: { reviews: 0 } }),
      ]);
      mockPrismaService.company_review.groupBy.mockResolvedValue([]);

      const result = await service.findCompanies({});

      expect(result.data[0].mean_rating).toBeNull();
      expect(result.data[0].total_reviews).toBe(0);
    });

    it('should apply a name filter', async () => {
      mockPrismaService.company.count.mockResolvedValue(0);
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company_review.groupBy.mockResolvedValue([]);

      await service.findCompanies({ name: 'Acme' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Acme', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should apply a location filter across address and country', async () => {
      mockPrismaService.company.count.mockResolvedValue(0);
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company_review.groupBy.mockResolvedValue([]);

      await service.findCompanies({ location: 'Lekki' });

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locations: {
              some: {
                OR: [
                  { address: { contains: 'Lekki', mode: 'insensitive' } },
                  { country: { contains: 'Lekki', mode: 'insensitive' } },
                ],
              },
            },
          }),
        }),
      );
    });

    it('should use groupBy + having to pre-filter by minimum mean rating', async () => {
      // Phase 2: rating filter groupBy
      mockPrismaService.company_review.groupBy.mockResolvedValueOnce([
        { company_id: 'company-1', _avg: { overall_rating: 4.5 } },
      ]);
      mockPrismaService.company.count.mockResolvedValue(1);
      mockPrismaService.company.findMany.mockResolvedValue([mockCompany()]);
      // Phase 4: avg for paginated companies
      mockPrismaService.company_review.groupBy.mockResolvedValueOnce([
        { company_id: 'company-1', _avg: { overall_rating: 4.5 } },
      ]);

      await service.findCompanies({ rating: 4 });

      expect(mockPrismaService.company_review.groupBy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          having: { overall_rating: { _avg: { gte: 4 } } },
          where: { status: ReviewStatus.PUBLISHED },
        }),
      );
      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['company-1'] },
          }),
        }),
      );
    });

    it('should return an empty list when no companies match the rating filter', async () => {
      mockPrismaService.company_review.groupBy.mockResolvedValueOnce([]);
      mockPrismaService.company.count.mockResolvedValue(0);
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company_review.groupBy.mockResolvedValueOnce([]);

      const result = await service.findCompanies({ rating: 5 });

      expect(result.data).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should not call rating groupBy when no rating filter is provided', async () => {
      mockPrismaService.company.count.mockResolvedValue(0);
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company_review.groupBy.mockResolvedValue([]);

      await service.findCompanies({});

      // Only phase 4 groupBy should be called (not phase 2)
      expect(mockPrismaService.company_review.groupBy).toHaveBeenCalledTimes(1);
    });

    it('should include locations ordered with headquarters first', async () => {
      const companyWithMultipleLocations = mockCompany({
        locations: [
          {
            id: 'loc-2',
            address: 'Central Business District',
            country: 'Nigeria',
            is_headquarters: false,
          },
          {
            id: 'loc-1',
            address: '14 Admiralty Way, Lekki',
            country: 'Nigeria',
            is_headquarters: true,
          },
        ],
      });
      mockPrismaService.company.count.mockResolvedValue(1);
      mockPrismaService.company.findMany.mockResolvedValue([
        companyWithMultipleLocations,
      ]);
      mockPrismaService.company_review.groupBy.mockResolvedValue([]);

      const result = await service.findCompanies({});

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            locations: expect.objectContaining({
              orderBy: { is_headquarters: 'desc' },
            }),
          }),
        }),
      );
      expect(result.data[0].locations).toHaveLength(2);
    });

    it('should only count and return reviews with PUBLISHED status', async () => {
      mockPrismaService.company.count.mockResolvedValue(0);
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company_review.groupBy.mockResolvedValue([]);

      await service.findCompanies({});

      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            _count: {
              select: {
                reviews: { where: { status: ReviewStatus.PUBLISHED } },
              },
            },
          }),
        }),
      );
    });
  });

  describe('findCompanyReviews', () => {
    it('should return paginated published reviews for a company', async () => {
      mockPrismaService.company_review.count.mockResolvedValue(2);
      mockPrismaService.company_review.findMany.mockResolvedValue([
        mockReview(),
        mockReview({ id: 'review-2' }),
      ]);

      const result = await service.findCompanyReviews('company-1', {});

      expect(mockPrismaService.company_review.count).toHaveBeenCalledWith({
        where: { company_id: 'company-1', status: ReviewStatus.PUBLISHED },
      });
      expect(mockPrismaService.company_review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { company_id: 'company-1', status: ReviewStatus.PUBLISHED },
          orderBy: { published_at: 'desc' },
        }),
      );
      expect(result.totalCount).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should return an empty list when the company has no published reviews', async () => {
      mockPrismaService.company_review.count.mockResolvedValue(0);
      mockPrismaService.company_review.findMany.mockResolvedValue([]);

      const result = await service.findCompanyReviews('company-1', {});

      expect(result.data).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should scope reviews to the requested company', async () => {
      mockPrismaService.company_review.count.mockResolvedValue(0);
      mockPrismaService.company_review.findMany.mockResolvedValue([]);

      await service.findCompanyReviews('company-99', {});

      expect(mockPrismaService.company_review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ company_id: 'company-99' }),
        }),
      );
    });

    it('should apply the sort direction from the query', async () => {
      mockPrismaService.company_review.count.mockResolvedValue(0);
      mockPrismaService.company_review.findMany.mockResolvedValue([]);

      await service.findCompanyReviews('company-1', { sort: 'asc' as any });

      expect(mockPrismaService.company_review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { published_at: 'asc' },
        }),
      );
    });
  });
});

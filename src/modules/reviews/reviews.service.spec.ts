import {
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyStatus, ReviewStatus } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import { ReviewsService } from './reviews.service';
import type { AuthenticatedRequest } from '@modules/user/user.types';

jest.mock('../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

const mockPrismaService = {
  company: {
    findFirst: jest.fn(),
  },
  company_review: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  company_location: {
    findFirst: jest.fn(),
  },
};

const mockUser = (sub: string): AuthenticatedRequest['user'] => ({ sub });

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

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a review for an approved company', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 'company-1',
      });
      mockPrismaService.company_review.create.mockResolvedValue(mockReview());

      const result = await service.create(mockUser('user-1'), 'company-1', {
        body: 'Great place to work.',
        overall_rating: 4,
      });

      expect(mockPrismaService.company.findFirst).toHaveBeenCalledWith({
        where: { id: 'company-1', status: CompanyStatus.APPROVED },
        select: { id: true },
      });
      expect(mockPrismaService.company_review.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          company_id: 'company-1',
          author_id: 'user-1',
          body: 'Great place to work.',
          overall_rating: 4,
          location_id: null,
        }),
      });
      expect(result).toEqual({
        message: 'Company Review created successfully.',
        code: HttpStatus.CREATED,
        data: expect.objectContaining({ id: 'review-1' }),
      });
    });

    it('should validate location belongs to company when location_id is provided', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 'company-1',
      });
      mockPrismaService.company_location.findFirst.mockResolvedValue({
        id: 'loc-1',
      });
      mockPrismaService.company_review.create.mockResolvedValue(
        mockReview({ location_id: 'loc-1' }),
      );

      await service.create(mockUser('user-1'), 'company-1', {
        body: 'Great place to work.',
        overall_rating: 4,
        location_id: 'loc-1',
      });

      expect(mockPrismaService.company_location.findFirst).toHaveBeenCalledWith(
        {
          where: { id: 'loc-1', company_id: 'company-1' },
          select: { id: true },
        },
      );
      expect(mockPrismaService.company_review.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ location_id: 'loc-1' }),
      });
    });

    it('should throw NotFoundException when the company is not approved', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser('user-1'), 'company-1', {
          body: 'Great place to work.',
          overall_rating: 4,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.company_review.create).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException when location does not belong to company', async () => {
      mockPrismaService.company.findFirst.mockResolvedValue({
        id: 'company-1',
      });
      mockPrismaService.company_location.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser('user-1'), 'company-1', {
          body: 'Great place to work.',
          overall_rating: 4,
          location_id: 'wrong-loc',
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(mockPrismaService.company_review.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of published reviews', async () => {
      mockPrismaService.company_review.count.mockResolvedValue(1);
      mockPrismaService.company_review.findMany.mockResolvedValue([
        mockReview(),
      ]);

      const result = await service.findAll('company-1', {
        page: 1,
        limit: 10,
      } as never);

      const where = {
        company_id: 'company-1',
        status: ReviewStatus.PUBLISHED,
      };

      expect(mockPrismaService.company_review.count).toHaveBeenCalledWith({
        where,
      });
      expect(mockPrismaService.company_review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ id: 'review-1' }),
          ]),
          totalCount: 1,
        }),
      );
    });

    it('should return an empty list when there are no published reviews', async () => {
      mockPrismaService.company_review.count.mockResolvedValue(0);
      mockPrismaService.company_review.findMany.mockResolvedValue([]);

      const result = await service.findAll('company-1', {
        page: 1,
        limit: 10,
      } as never);

      expect(result.data).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a published review by id', async () => {
      mockPrismaService.company_review.findFirst.mockResolvedValue(
        mockReview(),
      );

      const result = await service.findOne('company-1', 'review-1');

      expect(mockPrismaService.company_review.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'review-1',
          company_id: 'company-1',
          status: ReviewStatus.PUBLISHED,
        },
      });
      expect(result).toEqual({
        message: 'Company Review fetched successfully.',
        code: HttpStatus.OK,
        data: expect.objectContaining({ id: 'review-1' }),
      });
    });

    it('should throw NotFoundException when the review does not exist', async () => {
      mockPrismaService.company_review.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('company-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a review owned by the current user', async () => {
      const existing = mockReview({ author_id: 'user-1' });
      const updated = mockReview({ body: 'Even better.', author_id: 'user-1' });

      mockPrismaService.company_review.findFirst.mockResolvedValue(existing);
      mockPrismaService.company_review.update.mockResolvedValue(updated);

      const result = await service.update(
        mockUser('user-1'),
        'company-1',
        'review-1',
        { body: 'Even better.' },
      );

      expect(mockPrismaService.company_review.update).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        data: expect.objectContaining({ body: 'Even better.' }),
      });
      expect(result).toEqual({
        message: 'Company Review updated successfully.',
        code: HttpStatus.OK,
        data: expect.objectContaining({ body: 'Even better.' }),
      });
    });

    it('should validate new location belongs to company when location_id changes', async () => {
      const existing = mockReview({
        author_id: 'user-1',
        location_id: 'loc-1',
      });
      mockPrismaService.company_review.findFirst.mockResolvedValue(existing);
      mockPrismaService.company_location.findFirst.mockResolvedValue({
        id: 'loc-2',
      });
      mockPrismaService.company_review.update.mockResolvedValue(
        mockReview({ location_id: 'loc-2' }),
      );

      await service.update(mockUser('user-1'), 'company-1', 'review-1', {
        location_id: 'loc-2',
      });

      expect(mockPrismaService.company_location.findFirst).toHaveBeenCalledWith(
        {
          where: { id: 'loc-2', company_id: 'company-1' },
          select: { id: true },
        },
      );
    });

    it('should skip location validation when location_id is unchanged', async () => {
      const existing = mockReview({
        author_id: 'user-1',
        location_id: 'loc-1',
      });
      mockPrismaService.company_review.findFirst.mockResolvedValue(existing);
      mockPrismaService.company_review.update.mockResolvedValue(existing);

      await service.update(mockUser('user-1'), 'company-1', 'review-1', {
        location_id: 'loc-1',
      });

      expect(
        mockPrismaService.company_location.findFirst,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the review does not exist', async () => {
      mockPrismaService.company_review.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUser('user-1'), 'company-1', 'missing', {
          body: 'Updated.',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.company_review.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user does not own the review', async () => {
      mockPrismaService.company_review.findFirst.mockResolvedValue(
        mockReview({ author_id: 'other-user' }),
      );

      await expect(
        service.update(mockUser('user-1'), 'company-1', 'review-1', {
          body: 'Nope.',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrismaService.company_review.update).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException when new location does not belong to company', async () => {
      const existing = mockReview({
        author_id: 'user-1',
        location_id: 'loc-1',
      });
      mockPrismaService.company_review.findFirst.mockResolvedValue(existing);
      mockPrismaService.company_location.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUser('user-1'), 'company-1', 'review-1', {
          location_id: 'wrong-loc',
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(mockPrismaService.company_review.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a review owned by the current user', async () => {
      const existing = mockReview({ author_id: 'user-1' });
      mockPrismaService.company_review.findFirst.mockResolvedValue(existing);
      mockPrismaService.company_review.delete.mockResolvedValue(existing);

      const result = await service.remove(
        mockUser('user-1'),
        'company-1',
        'review-1',
      );

      expect(mockPrismaService.company_review.delete).toHaveBeenCalledWith({
        where: { id: 'review-1' },
      });
      expect(result).toEqual({
        message: 'Company Review deleted successfully.',
        code: HttpStatus.OK,
        data: expect.objectContaining({ id: 'review-1' }),
      });
    });

    it('should throw NotFoundException when the review does not exist', async () => {
      mockPrismaService.company_review.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockUser('user-1'), 'company-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockPrismaService.company_review.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user does not own the review', async () => {
      mockPrismaService.company_review.findFirst.mockResolvedValue(
        mockReview({ author_id: 'other-user' }),
      );

      await expect(
        service.remove(mockUser('user-1'), 'company-1', 'review-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockPrismaService.company_review.delete).not.toHaveBeenCalled();
    });
  });
});

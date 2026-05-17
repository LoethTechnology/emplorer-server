import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import type { AuthenticatedRequest } from '@modules/user/user.types';

jest.mock('../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

const mockUser = (sub: string): AuthenticatedRequest['user'] => ({ sub });

const mockReviewsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ReviewsController', () => {
  let controller: ReviewsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockReviewsService }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to ReviewsService', async () => {
    const user = mockUser('user-1');
    const dto = { body: 'Great place.', overall_rating: 5 };

    await controller.create(user, 'company-1', dto);

    expect(mockReviewsService.create).toHaveBeenCalledWith(
      user,
      'company-1',
      dto,
    );
  });

  it('should delegate findAll to ReviewsService with companyId and query', async () => {
    const query = { page: 1, limit: 10 } as never;

    await controller.findAll('company-1', query);

    expect(mockReviewsService.findAll).toHaveBeenCalledWith('company-1', query);
  });

  it('should delegate findOne to ReviewsService with companyId and reviewId', async () => {
    await controller.findOne('company-1', 'review-1');

    expect(mockReviewsService.findOne).toHaveBeenCalledWith(
      'company-1',
      'review-1',
    );
  });

  it('should delegate update to ReviewsService with user, companyId, reviewId, and dto', async () => {
    const user = mockUser('user-1');
    const dto = { body: 'Updated body.' };

    await controller.update(user, 'company-1', 'review-1', dto);

    expect(mockReviewsService.update).toHaveBeenCalledWith(
      user,
      'company-1',
      'review-1',
      dto,
    );
  });

  it('should delegate remove to ReviewsService with user, companyId, and reviewId', async () => {
    const user = mockUser('user-1');

    await controller.remove(user, 'company-1', 'review-1');

    expect(mockReviewsService.remove).toHaveBeenCalledWith(
      user,
      'company-1',
      'review-1',
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import type { AuthenticatedRequest } from './user.types';

jest.mock('../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

const mockAuthenticatedUser = (sub: string): AuthenticatedRequest['user'] => ({
  sub,
});

const mockUserService = {
  create: jest.fn(),
  findMe: jest.fn(),
  updateMe: jest.fn(),
  updatePassword: jest.fn(),
  createMyReview: jest.fn(),
  findMyReviews: jest.fn(),
  findMyReview: jest.fn(),
  updateMyReview: jest.fn(),
  removeMyReview: jest.fn(),
  removeMe: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to UserService', async () => {
    const createUserDto = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    };

    await controller.create(createUserDto);

    expect(mockUserService.create).toHaveBeenCalledWith(createUserDto);
  });

  it('should delegate findMe to UserService with the authenticated user', async () => {
    const user = mockAuthenticatedUser('user-1');

    await controller.findMe(user);

    expect(mockUserService.findMe).toHaveBeenCalledWith(user);
  });

  it('should delegate updateMe to UserService with the authenticated user', async () => {
    const user = mockAuthenticatedUser('user-2');
    const updateUserDto = { first_name: 'Updated' };

    await controller.updateMe(user, updateUserDto);

    expect(mockUserService.updateMe).toHaveBeenCalledWith(user, updateUserDto);
  });

  it('should delegate updatePassword to UserService with the authenticated user', async () => {
    const user = mockAuthenticatedUser('user-3');
    const updatePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    await controller.updatePassword(user, updatePasswordDto);

    expect(mockUserService.updatePassword).toHaveBeenCalledWith(
      user,
      updatePasswordDto,
    );
  });

  it('should delegate createMyReview to UserService with the authenticated user', async () => {
    const user = mockAuthenticatedUser('user-4');
    const createReviewDto = {
      company_id: 'company-1',
      body: 'A strong team with clear expectations.',
      overall_rating: 5,
      status: 'DRAFT',
    };

    await controller.createMyReview(user, createReviewDto);

    expect(mockUserService.createMyReview).toHaveBeenCalledWith(
      user,
      createReviewDto,
    );
  });

  it('should delegate findMyReviews to UserService with the authenticated user', async () => {
    const user = mockAuthenticatedUser('user-5');
    const query = { page: 1, limit: 10 };

    await controller.findMyReviews(user, query);

    expect(mockUserService.findMyReviews).toHaveBeenCalledWith(user, query);
  });

  it('should delegate findMyReview to UserService with the authenticated user and review id', async () => {
    const user = mockAuthenticatedUser('user-6');

    await controller.findMyReview(user, 'review-1');

    expect(mockUserService.findMyReview).toHaveBeenCalledWith(user, 'review-1');
  });

  it('should delegate updateMyReview to UserService with the authenticated user and review id', async () => {
    const user = mockAuthenticatedUser('user-7');
    const updateReviewDto = {
      body: 'Updated review body',
      status: 'PUBLISHED',
    };

    await controller.updateMyReview(user, 'review-2', updateReviewDto);

    expect(mockUserService.updateMyReview).toHaveBeenCalledWith(
      user,
      'review-2',
      updateReviewDto,
    );
  });

  it('should delegate removeMyReview to UserService with the authenticated user and review id', async () => {
    const user = mockAuthenticatedUser('user-8');

    await controller.removeMyReview(user, 'review-3');

    expect(mockUserService.removeMyReview).toHaveBeenCalledWith(
      user,
      'review-3',
    );
  });

  it('should delegate removeMe to UserService with the authenticated user', async () => {
    const user = mockAuthenticatedUser('user-9');

    await controller.removeMe(user);

    expect(mockUserService.removeMe).toHaveBeenCalledWith(user);
  });
});

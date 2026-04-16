import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

jest.mock('../../shared/modules/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

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

  it('should delegate findMe to UserService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-1' } } as never;

    await controller.findMe(req);

    expect(mockUserService.findMe).toHaveBeenCalledWith('user-1');
  });

  it('should delegate updateMe to UserService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-2' } } as never;
    const updateUserDto = { first_name: 'Updated' };

    await controller.updateMe(req, updateUserDto);

    expect(mockUserService.updateMe).toHaveBeenCalledWith(
      'user-2',
      updateUserDto,
    );
  });

  it('should delegate updatePassword to UserService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-3' } } as never;
    const updatePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    await controller.updatePassword(req, updatePasswordDto);

    expect(mockUserService.updatePassword).toHaveBeenCalledWith(
      'user-3',
      updatePasswordDto,
    );
  });

  it('should delegate createMyReview to UserService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-4' } } as never;
    const createReviewDto = {
      company_id: 'company-1',
      body: 'A strong team with clear expectations.',
      overall_rating: 5,
      status: 'DRAFT',
    };

    await controller.createMyReview(req, createReviewDto);

    expect(mockUserService.createMyReview).toHaveBeenCalledWith(
      'user-4',
      createReviewDto,
    );
  });

  it('should delegate findMyReviews to UserService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-5' } } as never;

    await controller.findMyReviews(req);

    expect(mockUserService.findMyReviews).toHaveBeenCalledWith('user-5');
  });

  it('should delegate findMyReview to UserService with the authenticated user id and review id', async () => {
    const req = { user: { sub: 'user-6' } } as never;

    await controller.findMyReview(req, 'review-1');

    expect(mockUserService.findMyReview).toHaveBeenCalledWith(
      'user-6',
      'review-1',
    );
  });

  it('should delegate updateMyReview to UserService with the authenticated user id and review id', async () => {
    const req = { user: { sub: 'user-7' } } as never;
    const updateReviewDto = {
      body: 'Updated review body',
      status: 'PUBLISHED',
    };

    await controller.updateMyReview(req, 'review-2', updateReviewDto);

    expect(mockUserService.updateMyReview).toHaveBeenCalledWith(
      'user-7',
      'review-2',
      updateReviewDto,
    );
  });

  it('should delegate removeMyReview to UserService with the authenticated user id and review id', async () => {
    const req = { user: { sub: 'user-8' } } as never;

    await controller.removeMyReview(req, 'review-3');

    expect(mockUserService.removeMyReview).toHaveBeenCalledWith(
      'user-8',
      'review-3',
    );
  });

  it('should delegate removeMe to UserService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-9' } } as never;

    await controller.removeMe(req);

    expect(mockUserService.removeMe).toHaveBeenCalledWith('user-9');
  });
});

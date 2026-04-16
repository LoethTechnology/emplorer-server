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

  it('should delegate removeMe to UserService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-4' } } as never;

    await controller.removeMe(req);

    expect(mockUserService.removeMe).toHaveBeenCalledWith('user-4');
  });
});

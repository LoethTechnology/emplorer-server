import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

jest.mock('../../shared/modules/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

const mockUsersService = {
  create: jest.fn(),
  findMe: jest.fn(),
  updateMe: jest.fn(),
  updatePassword: jest.fn(),
  removeMe: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to UsersService', async () => {
    const createUserDto = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    };

    await controller.create(createUserDto);

    expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
  });

  it('should delegate findMe to UsersService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-1' } } as never;

    await controller.findMe(req);

    expect(mockUsersService.findMe).toHaveBeenCalledWith('user-1');
  });

  it('should delegate updateMe to UsersService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-2' } } as never;
    const updateUserDto = { first_name: 'Updated' };

    await controller.updateMe(req, updateUserDto);

    expect(mockUsersService.updateMe).toHaveBeenCalledWith(
      'user-2',
      updateUserDto,
    );
  });

  it('should delegate updatePassword to UsersService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-3' } } as never;
    const updatePasswordDto = {
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    await controller.updatePassword(req, updatePasswordDto);

    expect(mockUsersService.updatePassword).toHaveBeenCalledWith(
      'user-3',
      updatePasswordDto,
    );
  });

  it('should delegate removeMe to UsersService with the authenticated user id', async () => {
    const req = { user: { sub: 'user-4' } } as never;

    await controller.removeMe(req);

    expect(mockUsersService.removeMe).toHaveBeenCalledWith('user-4');
  });
});

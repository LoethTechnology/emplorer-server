import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../../shared/modules/prisma/prisma.service';
import { UserService } from './user.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../../shared/modules/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new local user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: null,
        linkedin_profile_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });
      jest.mocked(argon2.hash).mockResolvedValue('hashed-password');

      const result = await service.create({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          first_name: 'Test',
          last_name: 'User',
          avatar_url: null,
          linkedin_profile_url: null,
        },
      });
      expect(result).toEqual({
        message: 'User created successfully.',
        code: HttpStatus.CREATED,
        data: expect.objectContaining({
          id: 'user-1',
          email: 'test@example.com',
        }),
      });
    });

    it('should complete an existing oauth-only user account', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'test@example.com',
        first_name: 'OAuth',
        last_name: 'User',
        avatar_url: null,
        linkedin_profile_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        password: null,
      });
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-2' });
      jest.mocked(argon2.hash).mockResolvedValue('hashed-password');

      await service.create({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          first_name: 'Test',
          last_name: 'User',
          avatar_url: null,
          linkedin_profile_url: null,
        },
      });
    });

    it('should reject an existing local account', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-3',
        email: 'test@example.com',
        first_name: 'Existing',
        last_name: 'User',
        avatar_url: null,
        linkedin_profile_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        password: 'hashed-password',
      });
      jest.mocked(argon2.hash).mockResolvedValue('hashed-password');

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findMe', () => {
    it('should return the active user account', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-4',
        email: 'user@example.com',
        first_name: 'Test',
        last_name: 'User',
        avatar_url: null,
        linkedin_profile_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      const result = await service.findMe('user-4');

      expect(result).toEqual({
        message: 'User fetched successfully.',
        code: HttpStatus.OK,
        data: expect.objectContaining({
          id: 'user-4',
          email: 'user@example.com',
        }),
      });
    });

    it('should throw when the active user account is missing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findMe('missing-user')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateMe', () => {
    it('should update the current user account', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-5',
          email: 'user@example.com',
          first_name: 'Current',
          last_name: 'User',
          avatar_url: null,
          linkedin_profile_url: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })
        .mockResolvedValueOnce(null);
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-5',
        email: 'next@example.com',
        first_name: 'Updated',
        last_name: 'User',
        avatar_url: null,
        linkedin_profile_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });

      const result = await service.updateMe('user-5', {
        email: 'next@example.com',
        first_name: 'Updated',
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-5' },
        data: {
          email: 'next@example.com',
          first_name: 'Updated',
        },
      });
      expect(result).toEqual({
        message: 'User updated successfully.',
        code: HttpStatus.OK,
        data: expect.objectContaining({
          id: 'user-5',
          email: 'next@example.com',
        }),
      });
    });

    it('should reject an email already used by another user', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-6',
          email: 'user@example.com',
          first_name: 'Current',
          last_name: 'User',
          avatar_url: null,
          linkedin_profile_url: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })
        .mockResolvedValueOnce({
          id: 'user-7',
          email: 'taken@example.com',
          first_name: 'Taken',
          last_name: 'User',
          avatar_url: null,
          linkedin_profile_url: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        });

      await expect(
        service.updateMe('user-6', { email: 'taken@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('updatePassword', () => {
    it('should update the current user password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-8',
        email: 'user@example.com',
        password: 'hashed-password',
        deleted_at: null,
      });
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-8' });
      jest.mocked(argon2.verify).mockResolvedValue(true);
      jest.mocked(argon2.hash).mockResolvedValue('next-hash');

      const result = await service.updatePassword('user-8', {
        oldPassword: 'password123',
        newPassword: 'newPassword123',
      });

      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed-password',
        'password123',
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-8' },
        data: { password: 'next-hash' },
      });
      expect(result).toEqual({
        message: 'User updated successfully.',
        code: HttpStatus.OK,
        data: 'Password updated successfully.',
      });
    });

    it('should reject accounts without a local password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-9',
        email: 'oauth@example.com',
        password: null,
        deleted_at: null,
      });

      await expect(
        service.updatePassword('user-9', {
          oldPassword: 'password123',
          newPassword: 'newPassword123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject an invalid current password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-10',
        email: 'user@example.com',
        password: 'hashed-password',
        deleted_at: null,
      });
      jest.mocked(argon2.verify).mockResolvedValue(false);

      await expect(
        service.updatePassword('user-10', {
          oldPassword: 'wrongPassword123',
          newPassword: 'newPassword123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('removeMe', () => {
    it('should delete the current user account', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-11',
        email: 'user@example.com',
        first_name: 'Delete',
        last_name: 'Me',
        avatar_url: null,
        linkedin_profile_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });
      mockPrismaService.user.delete.mockResolvedValue({ id: 'user-11' });

      const result = await service.removeMe('user-11');

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-11' },
      });
      expect(result).toEqual({
        message: 'User deleted successfully.',
        code: HttpStatus.OK,
        data: 'Account deleted successfully.',
      });
    });

    it('should translate foreign key delete failures into a conflict', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-12',
        email: 'user@example.com',
        first_name: 'Delete',
        last_name: 'Blocked',
        avatar_url: null,
        linkedin_profile_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      });
      mockPrismaService.user.delete.mockRejectedValue({ code: 'P2003' });

      await expect(service.removeMe('user-12')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});

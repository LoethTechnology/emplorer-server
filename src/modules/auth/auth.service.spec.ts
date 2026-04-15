import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { AuthHandlerService } from './handlers/auth.handler.service';
import { PrismaService } from '../../shared/modules/prisma/prisma.service';
import { AuthOtpPurpose, OAuthProvider } from 'prisma/generated/prisma/enums';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('../../shared/modules/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

const mockPrismaService = {
  oauth_account: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auth_otp: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAuthHandlerService = {
  validateLocalUser: jest.fn(),
  generateAccessToken: jest.fn().mockReturnValue('test-jwt-token'),
  getLinkedInFirstName: jest.fn().mockReturnValue('John'),
  getLinkedInLastName: jest.fn().mockReturnValue('Doe'),
  generateOtp: jest.fn().mockReturnValue('123456'),
  getOtpTtlMinutes: jest.fn().mockReturnValue(10),
  getOtpMaxAttempts: jest.fn().mockReturnValue(5),
  shouldExposeOtp: jest.fn().mockReturnValue(true),
  ensureOtpCanBeUsed: jest.fn().mockResolvedValue(undefined),
  recordFailedOtpAttempt: jest.fn().mockResolvedValue(undefined),
};

type FirstCallArg<T> = {
  mock: {
    calls: Array<[T, ...unknown[]]>;
  };
};

function getFirstCallArg<T>(mockFn: FirstCallArg<T>): T {
  const firstCall = mockFn.mock.calls[0];

  if (!firstCall) {
    throw new Error('Expected mock to have been called at least once.');
  }

  return firstCall[0];
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAuthHandlerService.generateAccessToken.mockReturnValue(
      'test-jwt-token',
    );
    mockAuthHandlerService.getLinkedInFirstName.mockReturnValue('John');
    mockAuthHandlerService.getLinkedInLastName.mockReturnValue('Doe');
    mockAuthHandlerService.generateOtp.mockReturnValue('123456');
    mockAuthHandlerService.getOtpTtlMinutes.mockReturnValue(10);
    mockAuthHandlerService.getOtpMaxAttempts.mockReturnValue(5);
    mockAuthHandlerService.shouldExposeOtp.mockReturnValue(true);
    mockAuthHandlerService.ensureOtpCanBeUsed.mockResolvedValue(undefined);
    mockAuthHandlerService.recordFailedOtpAttempt.mockResolvedValue(undefined);
    mockPrismaService.$transaction.mockImplementation(
      (callback: (transaction: typeof mockPrismaService) => unknown) =>
        Promise.resolve(callback(mockPrismaService)),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthHandlerService, useValue: mockAuthHandlerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should return a JWT token for the given user id', () => {
      expect(mockAuthHandlerService.generateAccessToken('user-123')).toBe(
        'test-jwt-token',
      );
      expect(mockAuthHandlerService.generateAccessToken).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });

  describe('findOrCreateUserFromLinkedin', () => {
    const mockProfile = {
      id: 'linkedin-123',
      displayName: 'John Doe',
      name: { givenName: 'John', familyName: 'Doe' },
      emails: [{ value: 'john@example.com' }],
      photos: [{ value: 'https://example.com/photo.jpg' }],
      _json: { publicProfileUrl: 'https://linkedin.com/in/johndoe' },
    } as unknown as import('passport-linkedin-oauth2').Profile;

    const mockOAuthUser = {
      profile: mockProfile,
      accessToken: 'linkedin-access-token',
      refreshToken: 'linkedin-refresh-token',
    };

    it('should update and return existing OAuth account user', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/photo.jpg',
        linkedin_profile_url: 'https://linkedin.com/in/johndoe',
      };
      const existingOAuthAccount = { id: 'oauth-1', user: existingUser };
      mockPrismaService.oauth_account.findUnique.mockResolvedValue(
        existingOAuthAccount,
      );
      mockPrismaService.oauth_account.update.mockResolvedValue(
        existingOAuthAccount,
      );

      const result = await service.findOrCreateUserFromLinkedin(mockOAuthUser);

      expect(mockPrismaService.oauth_account.findUnique).toHaveBeenCalledWith({
        where: {
          provider_provider_account_id: {
            provider: OAuthProvider.LINKEDIN,
            provider_account_id: 'linkedin-123',
          },
        },
        include: { user: true },
      });
      expect(mockPrismaService.oauth_account.update).toHaveBeenCalledWith({
        where: { id: 'oauth-1' },
        data: {
          access_token: 'linkedin-access-token',
          refresh_token: 'linkedin-refresh-token',
        },
      });
      expect(result).toEqual({
        message: 'User fetched successfully.',
        code: HttpStatus.OK,
        data: 'test-jwt-token',
      });
    });

    it('should link oauth account to existing user found by email', async () => {
      const existingUser = {
        id: 'user-2',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/photo.jpg',
        linkedin_profile_url: 'https://linkedin.com/in/johndoe',
      };
      const updatedUser = { ...existingUser };
      mockPrismaService.oauth_account.findUnique.mockResolvedValue(null);
      mockPrismaService.user.upsert.mockResolvedValue(updatedUser);
      mockPrismaService.oauth_account.create.mockResolvedValue({});

      const result = await service.findOrCreateUserFromLinkedin(mockOAuthUser);

      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        update: {
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/photo.jpg',
          linkedin_profile_url: 'https://linkedin.com/in/johndoe',
        },
        create: {
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/photo.jpg',
          linkedin_profile_url: 'https://linkedin.com/in/johndoe',
        },
      });
      expect(mockPrismaService.oauth_account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: OAuthProvider.LINKEDIN,
          provider_account_id: 'linkedin-123',
        }) as unknown,
      });
      expect(result).toEqual({
        message: 'User fetched successfully.',
        code: HttpStatus.OK,
        data: 'test-jwt-token',
      });
    });

    it('should create a new user when no existing oauth account or email match', async () => {
      const newUser = {
        id: 'user-3',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/photo.jpg',
        linkedin_profile_url: 'https://linkedin.com/in/johndoe',
      };
      mockPrismaService.oauth_account.findUnique.mockResolvedValue(null);
      mockPrismaService.user.upsert.mockResolvedValue(newUser);
      mockPrismaService.oauth_account.create.mockResolvedValue({});

      const result = await service.findOrCreateUserFromLinkedin(mockOAuthUser);

      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        update: {
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/photo.jpg',
          linkedin_profile_url: 'https://linkedin.com/in/johndoe',
        },
        create: {
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/photo.jpg',
          linkedin_profile_url: 'https://linkedin.com/in/johndoe',
        },
      });
      expect(result).toEqual({
        message: 'User fetched successfully.',
        code: HttpStatus.OK,
        data: 'test-jwt-token',
      });
    });
  });

  describe('register', () => {
    it('should create a new local user and return the auth response', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-4',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        password: 'hashed-password',
      });
      jest.mocked(argon2.hash).mockResolvedValue('hashed-password');

      const result = await service.register({
        email: 'New@example.com',
        password: 'password123',
        first_name: ' New ',
        last_name: ' User ',
      });

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'New@example.com',
          password: 'hashed-password',
          first_name: ' New ',
          last_name: ' User ',
        },
      });
      expect(result).toEqual({
        message: 'User created successfully.',
        code: HttpStatus.CREATED,
        data: 'test-jwt-token',
      });
    });
  });

  describe('login', () => {
    it('should verify local credentials and return the auth response', async () => {
      mockAuthHandlerService.validateLocalUser.mockResolvedValue({
        id: 'user-5',
        email: 'login@example.com',
        first_name: 'Login',
        last_name: 'User',
        password: 'hashed-password',
      });
      jest.mocked(argon2.verify).mockResolvedValue(true);

      const result = await service.login({
        email: 'login@example.com',
        password: 'password123',
      });

      expect(mockAuthHandlerService.validateLocalUser).toHaveBeenCalledWith(
        'login@example.com',
        'password123',
      );
      expect(result).toEqual({
        message: 'User fetched successfully.',
        code: HttpStatus.OK,
        data: 'test-jwt-token',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should create a password reset otp and expose it in non-production mode', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-6',
        email: 'reset@example.com',
        first_name: 'Reset',
        last_name: 'User',
        password: 'hashed-password',
        deleted_at: null,
      });
      jest.mocked(argon2.hash).mockResolvedValue('hashed-otp');

      const result = await service.forgotPassword({
        email: 'reset@example.com',
      });
      const otpInvalidationArgs = getFirstCallArg(
        mockPrismaService.auth_otp.updateMany as FirstCallArg<{
          where: {
            user_id: string;
            purpose: AuthOtpPurpose;
            consumed_at: null;
          };
          data: { consumed_at: Date };
        }>,
      );
      const otpCreateArgs = getFirstCallArg(
        mockPrismaService.auth_otp.create as FirstCallArg<{
          data: {
            user_id: string;
            code_hash: string;
            max_attempts: number;
            expires_at: Date;
          };
        }>,
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(otpInvalidationArgs.where).toEqual({
        user_id: 'user-6',
        purpose: AuthOtpPurpose.PASSWORD_RESET,
        consumed_at: null,
      });
      expect(otpInvalidationArgs.data.consumed_at).toBeInstanceOf(Date);
      expect(otpCreateArgs.data).toMatchObject({
        user_id: 'user-6',
        code_hash: 'hashed-otp',
        max_attempts: 5,
      });
      expect(otpCreateArgs.data.expires_at).toBeInstanceOf(Date);
      expect(result).toEqual({
        message: 'Auth OTP created successfully.',
        code: HttpStatus.CREATED,
        data: {
          otp: '123456',
        },
      });
    });
  });

  describe('resetPassword', () => {
    it('should update the password and consume the otp when the otp is valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-7',
        email: 'reset@example.com',
        first_name: 'Reset',
        last_name: 'User',
        password: 'old-password-hash',
        deleted_at: null,
      });
      mockPrismaService.auth_otp.findFirst.mockResolvedValue({
        id: 'otp-1',
        user_id: 'user-7',
        purpose: AuthOtpPurpose.PASSWORD_RESET,
        code_hash: 'hashed-otp',
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
        consumed_at: null,
        attempts: 0,
        max_attempts: 5,
      });
      jest.mocked(argon2.verify).mockResolvedValueOnce(true);
      jest.mocked(argon2.hash).mockResolvedValue('new-password-hash');

      const result = await service.resetPassword({
        email: 'reset@example.com',
        otp: '123456',
        newPassword: 'newPassword123',
      });
      const consumedOtpArgs = getFirstCallArg(
        mockPrismaService.auth_otp.update as FirstCallArg<{
          where: { id: string };
          data: { consumed_at: Date };
        }>,
      );

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-7' },
        data: { password: 'new-password-hash' },
      });
      expect(consumedOtpArgs.where).toEqual({ id: 'otp-1' });
      expect(consumedOtpArgs.data.consumed_at).toBeInstanceOf(Date);
      expect(result).toEqual({
        message: 'User updated successfully.',
        code: HttpStatus.OK,
        data: 'Password reset successful.',
      });
    });
  });
});

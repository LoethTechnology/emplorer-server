import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../shared/modules/prisma/prisma.service';
import { OAuthProvider } from 'prisma/generated/prisma/enums';

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
    upsert: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('test-jwt-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should return a JWT token for the given user id', () => {
      const token = service.generateAccessToken('user-123');
      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: 'user-123' });
      expect(token).toBe('test-jwt-token');
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
      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).toEqual(existingUser);
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
        create: expect.objectContaining({
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/photo.jpg',
          linkedin_profile_url: 'https://linkedin.com/in/johndoe',
        }) as unknown,
      });
      expect(mockPrismaService.oauth_account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: OAuthProvider.LINKEDIN,
          provider_account_id: 'linkedin-123',
        }) as unknown,
      });
      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).toEqual(updatedUser);
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
        create: expect.objectContaining({
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/photo.jpg',
          linkedin_profile_url: 'https://linkedin.com/in/johndoe',
        }) as unknown,
      });
      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).toEqual(newUser);
    });
  });
});

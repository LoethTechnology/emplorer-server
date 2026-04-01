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
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
        display_name: 'John Doe',
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
        display_name: 'John Doe',
      };
      const updatedUser = { ...existingUser, first_name: 'John' };
      mockPrismaService.oauth_account.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockPrismaService.oauth_account.create.mockResolvedValue({});

      const result = await service.findOrCreateUserFromLinkedin(mockOAuthUser);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockPrismaService.oauth_account.create).toHaveBeenCalled();
      const oauthCalls = (
        mockPrismaService.oauth_account.create as jest.Mock<unknown>
      ).mock.calls as unknown as Array<
        [{ data: { provider: string; provider_account_id: string } }]
      >;
      expect(oauthCalls[0][0].data.provider).toBe(OAuthProvider.LINKEDIN);
      expect(oauthCalls[0][0].data.provider_account_id).toBe('linkedin-123');
      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).toEqual(updatedUser);
    });

    it('should create a new user when no existing account or email match', async () => {
      const newUser = {
        id: 'user-3',
        email: 'john@example.com',
        display_name: 'John Doe',
      };
      mockPrismaService.oauth_account.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(newUser);
      mockPrismaService.oauth_account.create.mockResolvedValue({});

      const result = await service.findOrCreateUserFromLinkedin(mockOAuthUser);

      expect(mockPrismaService.user.create).toHaveBeenCalled();
      const userCalls = (mockPrismaService.user.create as jest.Mock<unknown>)
        .mock.calls as unknown as Array<
        [{ data: { email: string; display_name: string } }]
      >;
      expect(userCalls[0][0].data.email).toBe('john@example.com');
      expect(userCalls[0][0].data.display_name).toBe('John Doe');
      expect(result.accessToken).toBe('test-jwt-token');
      expect(result.user).toEqual(newUser);
    });
  });
});

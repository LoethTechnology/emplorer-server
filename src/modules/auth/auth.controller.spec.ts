import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

jest.mock('../../shared/modules/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn(),
  JwtModule: { registerAsync: jest.fn() },
}));

const mockAuthService = {
  findOrCreateUserFromLinkedin: jest.fn(),
  generateAccessToken: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('linkedInLogin', () => {
    it('should have linkedInLogin method', () => {
      expect(typeof controller.linkedInLogin).toBe('function');
    });
  });

  describe('linkedInCallback', () => {
    it('should call findOrCreateUserFromLinkedin and return json response', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockAuthService.findOrCreateUserFromLinkedin.mockResolvedValue({
        accessToken: 'jwt-token',
        user: mockUser,
      });

      const mockProfile = { id: 'linkedin-123', displayName: 'Test User' };
      const mockOAuthUser = {
        profile: mockProfile,
        accessToken: 'linkedin-access-token',
        refreshToken: 'linkedin-refresh-token',
      };
      const mockReq = { user: mockOAuthUser } as Partial<
        import('express').Request
      >;
      const mockJson = jest.fn();
      const mockRes = { json: mockJson } as Partial<import('express').Response>;

      await controller.linkedInCallback(mockReq, mockRes);

      expect(mockAuthService.findOrCreateUserFromLinkedin).toHaveBeenCalledWith(
        mockOAuthUser,
      );
      expect(mockJson).toHaveBeenCalledWith({
        accessToken: 'jwt-token',
        user: mockUser,
      });
    });
  });
});

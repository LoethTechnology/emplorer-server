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
  register: jest.fn(),
  login: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  findOrCreateUserFromLinkedin: jest.fn(),
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

  describe('register', () => {
    it('should delegate registration to AuthService', async () => {
      mockAuthService.register.mockResolvedValue({ accessToken: 'jwt-token' });

      await controller.register({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      });

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
      });
    });
  });

  describe('login', () => {
    it('should delegate login to AuthService', async () => {
      mockAuthService.login.mockResolvedValue({ accessToken: 'jwt-token' });

      await controller.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should delegate forgotPassword to AuthService', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({ message: 'ok' });

      await controller.forgotPassword({ email: 'test@example.com' });

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('should delegate resetPassword to AuthService', async () => {
      mockAuthService.resetPassword.mockResolvedValue({ message: 'ok' });

      await controller.resetPassword({
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newPassword123',
      });

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newPassword123',
      });
    });
  });

  describe('linkedInCallback', () => {
    it('should call findOrCreateUserFromLinkedin and return json response', async () => {
      mockAuthService.findOrCreateUserFromLinkedin.mockResolvedValue({
        accessToken: 'jwt-token',
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
      });
    });
  });
});

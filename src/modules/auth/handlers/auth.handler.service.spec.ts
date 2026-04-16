import { Test, type TestingModule } from '@nestjs/testing';
import { AuthHandlerService } from './auth.handler.service';
import { PrismaService } from '../../../shared/modules/prisma';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

jest.mock('../../../shared/modules/prisma', () => ({
  PrismaService: jest.fn(),
}));

describe('AuthHandlerService', () => {
  let service: AuthHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthHandlerService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            auth_otp: {
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthHandlerService>(AuthHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

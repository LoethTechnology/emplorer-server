import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { auth_otp, user } from 'prisma/generated/prisma/client';
import type { LinkedInOAuthUser } from '../auth.types';
import { PrismaService } from '../../../shared/modules/prisma/prisma.service';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const INVALID_RESET_OTP_MESSAGE = 'Invalid or expired OTP.';

@Injectable()
export class AuthHandlerService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateLocalUser(email: string, password: string): Promise<user> {
    const dbUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!dbUser || !dbUser.password || dbUser.deleted_at) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await argon2.verify(dbUser.password, password);

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return dbUser;
  }

  generateAccessToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  getLinkedInFirstName(profile: LinkedInOAuthUser['profile']): string {
    return (
      profile.name?.givenName ??
      profile.displayName?.split(' ').find(Boolean) ??
      'LinkedIn'
    );
  }

  getLinkedInLastName(profile: LinkedInOAuthUser['profile']): string {
    return (
      profile.name?.familyName ??
      profile.displayName?.split(' ').slice(1).join(' ').trim() ??
      'User'
    );
  }

  generateOtp(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  getOtpTtlMinutes(): number {
    return Number(
      this.configService.get<string>('PASSWORD_RESET_OTP_TTL_MINUTES', '10'),
    );
  }

  getOtpMaxAttempts(): number {
    return Number(
      this.configService.get<string>('PASSWORD_RESET_OTP_MAX_ATTEMPTS', '5'),
    );
  }

  shouldExposeOtp(): boolean {
    return this.configService.get<string>('NODE_ENV') !== 'production';
  }

  async ensureOtpCanBeUsed(otpRecord: auth_otp): Promise<void> {
    const exhausted = otpRecord.attempts >= otpRecord.max_attempts;
    const expired = otpRecord.expires_at.getTime() <= Date.now();

    if (!exhausted && !expired) {
      return;
    }

    await this.prismaService.auth_otp.update({
      where: { id: otpRecord.id },
      data: { consumed_at: otpRecord.consumed_at ?? new Date() },
    });

    throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
  }

  async recordFailedOtpAttempt(otpRecord: auth_otp): Promise<void> {
    const nextAttemptCount = otpRecord.attempts + 1;

    await this.prismaService.auth_otp.update({
      where: { id: otpRecord.id },
      data: {
        attempts: {
          increment: 1,
        },
        consumed_at:
          nextAttemptCount >= otpRecord.max_attempts ? new Date() : undefined,
      },
    });
  }
}

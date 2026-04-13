import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthOtpPurpose, OAuthProvider } from 'prisma/generated/prisma/enums';
import type { auth_otp, user } from 'prisma/generated/prisma/client';
import { PrismaService } from '../../shared/modules/prisma/prisma.service';
import type {
  AuthTokenResponse,
  ForgotPasswordResponse,
  LinkedInOAuthUser,
  MessageResponse,
} from './auth.types';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginAuthDto } from './dto/login-auth.dto';
import type { RegisterAuthDto } from './dto/register-auth.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

const PASSWORD_RESET_REQUEST_MESSAGE =
  'If the account exists, a password reset OTP has been generated.';
const PASSWORD_RESET_SUCCESS_MESSAGE = 'Password reset successful.';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const INVALID_RESET_OTP_MESSAGE = 'Invalid or expired OTP.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async findOrCreateUserFromLinkedin(
    oauthUser: LinkedInOAuthUser,
  ): Promise<AuthTokenResponse> {
    const { profile, accessToken, refreshToken } = oauthUser;
    const providerAccountId = profile.id;
    const email = profile.emails?.[0]?.value ?? null;
    const first_name = this.getLinkedInFirstName(profile);
    const last_name = this.getLinkedInLastName(profile);
    const avatar_url = profile.photos?.[0]?.value ?? null;
    const linkedin_profile_url =
      (profile._json as Record<string, string> | undefined)?.publicProfileUrl ??
      null;

    const existingOAuthAccount =
      await this.prismaService.oauth_account.findUnique({
        where: {
          provider_provider_account_id: {
            provider: OAuthProvider.LINKEDIN,
            provider_account_id: providerAccountId,
          },
        },
        include: { user: true },
      });

    if (existingOAuthAccount) {
      await this.prismaService.oauth_account.update({
        where: { id: existingOAuthAccount.id },
        data: {
          access_token: accessToken,
          refresh_token: refreshToken ?? null,
        },
      });
      const token = this.generateAccessToken(existingOAuthAccount.user.id);
      return {
        accessToken: token,
        user: existingOAuthAccount.user,
      };
    }

    const userProfileData = {
      first_name,
      last_name,
      avatar_url,
      linkedin_profile_url,
    };

    const dbUser = email
      ? await this.prismaService.user.upsert({
          where: { email },
          update: userProfileData,
          create: { email, ...userProfileData },
        })
      : await this.prismaService.user.create({
          data: { email, ...userProfileData },
        });

    await this.prismaService.oauth_account.create({
      data: {
        user_id: dbUser.id,
        provider: OAuthProvider.LINKEDIN,
        provider_account_id: providerAccountId,
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
        token_type: 'Bearer',
        scope: ['openid', 'profile', 'email'],
      },
    });

    const token = this.generateAccessToken(dbUser.id);
    return { accessToken: token, user: dbUser };
  }

  async register(registerAuthDto: RegisterAuthDto): Promise<AuthTokenResponse> {
    const email = registerAuthDto.email;
    const passwordHash = await argon2.hash(registerAuthDto.password);
    const first_name = registerAuthDto.first_name;
    const last_name = registerAuthDto.last_name;

    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser?.password) {
      throw new ConflictException(
        'A local account already exists for this email.',
      );
    }

    const dbUser = existingUser
      ? await this.prismaService.user.update({
          where: { id: existingUser.id },
          data: {
            email,
            first_name,
            last_name,
            password: passwordHash,
          },
        })
      : await this.prismaService.user.create({
          data: {
            email,
            first_name,
            last_name,
            password: passwordHash,
          },
        });

    return {
      accessToken: this.generateAccessToken(dbUser.id),
      user: dbUser,
    };
  }

  async login(loginAuthDto: LoginAuthDto): Promise<AuthTokenResponse> {
    const dbUser = await this.validateLocalUser(
      loginAuthDto.email,
      loginAuthDto.password,
    );

    return {
      accessToken: this.generateAccessToken(dbUser.id),
      user: dbUser,
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    const email = forgotPasswordDto.email;
    const dbUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!dbUser || dbUser.deleted_at) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const otp = this.generateOtp();
    const codeHash = await argon2.hash(otp);
    const expiresAt = new Date(
      Date.now() + this.getOtpTtlMinutes() * 60 * 1000,
    );

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.auth_otp.updateMany({
        where: {
          user_id: dbUser.id,
          purpose: AuthOtpPurpose.PASSWORD_RESET,
          consumed_at: null,
        },
        data: {
          consumed_at: new Date(),
        },
      });

      await transaction.auth_otp.create({
        data: {
          user_id: dbUser.id,
          code_hash: codeHash,
          expires_at: expiresAt,
          max_attempts: this.getOtpMaxAttempts(),
        },
      });
    });

    if (this.shouldExposeOtp()) {
      return {
        message: PASSWORD_RESET_REQUEST_MESSAGE,
        otp,
      };
    }

    return { message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponse> {
    const email = resetPasswordDto.email;
    const dbUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!dbUser || dbUser.deleted_at) {
      throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
    }

    const otpRecord = await this.prismaService.auth_otp.findFirst({
      where: {
        user_id: dbUser.id,
        purpose: AuthOtpPurpose.PASSWORD_RESET,
        consumed_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
    }

    await this.ensureOtpCanBeUsed(otpRecord);

    const otpMatches = await argon2.verify(
      otpRecord.code_hash,
      resetPasswordDto.otp,
    );

    if (!otpMatches) {
      await this.recordFailedOtpAttempt(otpRecord);
      throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
    }

    const passwordHash = await argon2.hash(resetPasswordDto.newPassword);

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: dbUser.id },
        data: { password: passwordHash },
      });

      await transaction.auth_otp.update({
        where: { id: otpRecord.id },
        data: { consumed_at: new Date() },
      });
    });

    return { message: PASSWORD_RESET_SUCCESS_MESSAGE };
  }

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

  private getLinkedInFirstName(profile: LinkedInOAuthUser['profile']): string {
    return (
      profile.name?.givenName ??
      profile.displayName?.split(' ').find(Boolean) ??
      'LinkedIn'
    );
  }

  private getLinkedInLastName(profile: LinkedInOAuthUser['profile']): string {
    return (
      profile.name?.familyName ??
      profile.displayName?.split(' ').slice(1).join(' ').trim() ??
      'User'
    );
  }

  private generateOtp(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private getOtpTtlMinutes(): number {
    return Number(
      this.configService.get<string>('PASSWORD_RESET_OTP_TTL_MINUTES', '10'),
    );
  }

  private getOtpMaxAttempts(): number {
    return Number(
      this.configService.get<string>('PASSWORD_RESET_OTP_MAX_ATTEMPTS', '5'),
    );
  }

  private shouldExposeOtp(): boolean {
    return this.configService.get<string>('NODE_ENV') !== 'production';
  }

  private async ensureOtpCanBeUsed(otpRecord: auth_otp): Promise<void> {
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

  private async recordFailedOtpAttempt(otpRecord: auth_otp): Promise<void> {
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

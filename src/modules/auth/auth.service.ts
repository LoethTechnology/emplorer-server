import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthOtpPurpose, OAuthProvider } from 'prisma/generated/prisma/enums';
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
import { AuthHandlerService } from './handlers/auth.handler.service';

const PASSWORD_RESET_REQUEST_MESSAGE =
  'If the account exists, a password reset OTP has been generated.';
const PASSWORD_RESET_SUCCESS_MESSAGE = 'Password reset successful.';
const INVALID_RESET_OTP_MESSAGE = 'Invalid or expired OTP.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authHandlerService: AuthHandlerService,
  ) {}

  async findOrCreateUserFromLinkedin(
    oauthUser: LinkedInOAuthUser,
  ): Promise<AuthTokenResponse> {
    const { profile, accessToken, refreshToken } = oauthUser;
    const providerAccountId = profile.id;
    const email = profile.emails?.[0]?.value ?? null;
    const first_name = this.authHandlerService.getLinkedInFirstName(profile);
    const last_name = this.authHandlerService.getLinkedInLastName(profile);
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
      const token = this.authHandlerService.generateAccessToken(
        existingOAuthAccount.user.id,
      );
      return {
        accessToken: token,
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

    const token = this.authHandlerService.generateAccessToken(dbUser.id);
    return { accessToken: token };
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
      accessToken: this.authHandlerService.generateAccessToken(dbUser.id),
    };
  }

  async login(loginAuthDto: LoginAuthDto): Promise<AuthTokenResponse> {
    const dbUser = await this.authHandlerService.validateLocalUser(
      loginAuthDto.email,
      loginAuthDto.password,
    );

    return {
      accessToken: this.authHandlerService.generateAccessToken(dbUser.id),
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

    const otp = this.authHandlerService.generateOtp();
    const codeHash = await argon2.hash(otp);
    const expiresAt = new Date(
      Date.now() + this.authHandlerService.getOtpTtlMinutes() * 60 * 1000,
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
          max_attempts: this.authHandlerService.getOtpMaxAttempts(),
        },
      });
    });

    if (this.authHandlerService.shouldExposeOtp()) {
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

    await this.authHandlerService.ensureOtpCanBeUsed(otpRecord);

    const otpMatches = await argon2.verify(
      otpRecord.code_hash,
      resetPasswordDto.otp,
    );

    if (!otpMatches) {
      await this.authHandlerService.recordFailedOtpAttempt(otpRecord);
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
}

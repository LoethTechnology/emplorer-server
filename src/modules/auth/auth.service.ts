import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthOtpPurpose, OAuthProvider } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma';
import { CrudEnums, DbModels } from '../../shared/types';
import { CrudResponse } from '../../shared/utils/response';
import type {
  AuthTokenResponse,
  ForgotPasswordResponse,
  LinkedInOAuthUser,
  MessageResponse,
} from './auth.types';
import type { ForgotPasswordDto, LoginAuthDto, ResetPasswordDto } from './dto';
import { AuthHandlerService } from './handlers/auth.handler.service';
import { AUTH_RESPONSE_MESSAGES } from './utils/auth.utils';

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

      return CrudResponse(DbModels.USER, CrudEnums.READ, token);
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

    return CrudResponse(DbModels.USER, CrudEnums.READ, token);
  }

  async login(loginAuthDto: LoginAuthDto): Promise<AuthTokenResponse> {
    const dbUser = await this.authHandlerService.validateLocalUser(
      loginAuthDto.email,
      loginAuthDto.password,
    );

    return CrudResponse(
      DbModels.USER,
      CrudEnums.READ,
      this.authHandlerService.generateAccessToken(dbUser.id),
    );
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    const email = forgotPasswordDto.email;
    const dbUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!dbUser || dbUser.deleted_at) {
      return CrudResponse(DbModels.AUTH_OTP, CrudEnums.CREATE, null);
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
      return CrudResponse(DbModels.AUTH_OTP, CrudEnums.CREATE, { otp });
    }

    return CrudResponse(DbModels.AUTH_OTP, CrudEnums.CREATE, null);
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponse> {
    const email = resetPasswordDto.email;
    const dbUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!dbUser || dbUser.deleted_at) {
      throw new BadRequestException(AUTH_RESPONSE_MESSAGES.invalidResetOtp);
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
      throw new BadRequestException(AUTH_RESPONSE_MESSAGES.invalidResetOtp);
    }

    await this.authHandlerService.ensureOtpCanBeUsed(otpRecord);

    const otpMatches = await argon2.verify(
      otpRecord.code_hash,
      resetPasswordDto.otp,
    );

    if (!otpMatches) {
      await this.authHandlerService.recordFailedOtpAttempt(otpRecord);
      throw new BadRequestException(AUTH_RESPONSE_MESSAGES.invalidResetOtp);
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

    return CrudResponse(
      DbModels.USER,
      CrudEnums.UPDATE,
      AUTH_RESPONSE_MESSAGES.passwordReset,
    );
  }
}

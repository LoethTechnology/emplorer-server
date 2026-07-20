import type { Profile } from 'passport-linkedin-oauth2';
import type { user } from 'prisma/generated/prisma/client';
import type { ApiSuccessResponse } from '../../shared/utils/response';

export type PublicUser = Omit<user, 'password'>;

export interface LinkedInOAuthUser {
  profile: Profile;
  accessToken: string;
  refreshToken: string;
}

export type AuthTokenResponse = ApiSuccessResponse<string>;

export interface JwtPayload {
  sub: string;
}

export interface ForgotPasswordData {
  otp?: string;
}

export type ForgotPasswordResponse =
  ApiSuccessResponse<ForgotPasswordData | null>;

export interface SendVerificationEmailData {
  otp?: string;
}

export type SendVerificationEmailResponse =
  ApiSuccessResponse<SendVerificationEmailData | null>;

export type MessageResponse = ApiSuccessResponse<string>;

export type AuthMailer = {
  sendPasswordResetOtpEmail(
    email: string,
    firstName: string,
    otp: string,
    ttlMinutes: number,
  ): Promise<void>;
  sendPasswordResetConfirmationEmail(
    email: string,
    firstName: string,
  ): Promise<void>;
  sendEmailVerificationOtpEmail(
    email: string,
    firstName: string,
    otp: string,
    ttlMinutes: number,
  ): Promise<void>;
  sendEmailVerifiedConfirmationEmail(
    email: string,
    firstName: string,
  ): Promise<void>;
};

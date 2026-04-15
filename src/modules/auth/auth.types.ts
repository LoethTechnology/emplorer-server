import type { Profile } from 'passport-linkedin-oauth2';
import type { user } from 'prisma/generated/prisma/client';

export type PublicUser = Omit<user, 'password'>;

export interface LinkedInOAuthUser {
  profile: Profile;
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokenResponse {
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
}

export interface ForgotPasswordResponse {
  message: string;
  otp?: string;
}

export interface MessageResponse {
  message: string;
}

import type { Profile } from 'passport-linkedin-oauth2';
import type { user } from 'prisma/generated/prisma/client';

export interface LinkedInOAuthUser {
  profile: Profile;
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  user: user;
}

export interface JwtPayload {
  sub: string;
}

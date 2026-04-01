import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Profile } from 'passport-linkedin-oauth2';
import { OAuthProvider } from 'prisma/generated/prisma/enums';
import type { user } from 'prisma/generated/prisma/client';
import { PrismaService } from '../../shared/modules/prisma/prisma.service';

export interface LinkedInOAuthUser {
  profile: Profile;
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  user: user;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async findOrCreateUserFromLinkedin(
    oauthUser: LinkedInOAuthUser,
  ): Promise<AuthTokenResponse> {
    const { profile, accessToken, refreshToken } = oauthUser;
    const providerAccountId = profile.id;
    const email = profile.emails?.[0]?.value ?? null;
    const firstName = profile.name?.givenName ?? null;
    const lastName = profile.name?.familyName ?? null;
    const displayName =
      profile.displayName ||
      `${firstName ?? ''} ${lastName ?? ''}`.trim() ||
      providerAccountId;
    const avatarUrl = profile.photos?.[0]?.value ?? null;
    const linkedinProfileUrl =
      (profile._json as Record<string, string> | undefined)?.publicProfileUrl ??
      null;

    const existingOAuthAccount = await this.prisma.oauth_account.findUnique({
      where: {
        provider_provider_account_id: {
          provider: OAuthProvider.LINKEDIN,
          provider_account_id: providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingOAuthAccount) {
      await this.prisma.oauth_account.update({
        where: { id: existingOAuthAccount.id },
        data: {
          access_token: accessToken,
          refresh_token: refreshToken ?? null,
        },
      });
      const token = this.generateAccessToken(existingOAuthAccount.user.id);
      return { accessToken: token, user: existingOAuthAccount.user };
    }

    let existingUser: user | null = null;
    if (email) {
      existingUser = await this.prisma.user.findUnique({ where: { email } });
    }

    const dbUser = existingUser
      ? await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl,
            linkedin_profile_url: linkedinProfileUrl,
          },
        })
      : await this.prisma.user.create({
          data: {
            email,
            display_name: displayName,
            first_name: firstName,
            last_name: lastName,
            avatar_url: avatarUrl,
            linkedin_profile_url: linkedinProfileUrl,
          },
        });

    await this.prisma.oauth_account.create({
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

  generateAccessToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }
}

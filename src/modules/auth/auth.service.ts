import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuthProvider } from 'prisma/generated/prisma/enums';
import { PrismaService } from '../../shared/modules/prisma/prisma.service';
import type { AuthTokenResponse, LinkedInOAuthUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async findOrCreateUserFromLinkedin(
    oauthUser: LinkedInOAuthUser,
  ): Promise<AuthTokenResponse> {
    const { profile, accessToken, refreshToken } = oauthUser;
    const providerAccountId = profile.id;
    const email = profile.emails?.[0]?.value ?? null;
    const first_name = profile.name?.givenName ?? null;
    const last_name = profile.name?.familyName ?? null;
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
      return { accessToken: token, user: existingOAuthAccount.user };
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

  generateAccessToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }
}

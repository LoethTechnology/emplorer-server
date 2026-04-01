import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, LinkedInOAuthUser } from './auth.service';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('linkedin')
  @UseGuards(LinkedInAuthGuard)
  linkedInLogin(): void {
    // Initiates LinkedIn OAuth flow — handled by Passport
  }

  @Get('linkedin/callback')
  @UseGuards(LinkedInAuthGuard)
  async linkedInCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const oauthUser = req.user as LinkedInOAuthUser;
    const { accessToken, user } =
      await this.authService.findOrCreateUserFromLinkedin(oauthUser);
    res.json({ accessToken, user });
  }
}

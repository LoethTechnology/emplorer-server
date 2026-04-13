import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type {
  AuthTokenResponse,
  ForgotPasswordResponse,
  LinkedInOAuthUser,
  MessageResponse,
} from './auth.types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() registerAuthDto: RegisterAuthDto,
  ): Promise<AuthTokenResponse> {
    return this.authService.register(registerAuthDto);
  }

  @Post('login')
  login(@Body() loginAuthDto: LoginAuthDto): Promise<AuthTokenResponse> {
    return this.authService.login(loginAuthDto);
  }

  @Post('forgot-password')
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponse> {
    return this.authService.resetPassword(resetPasswordDto);
  }

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

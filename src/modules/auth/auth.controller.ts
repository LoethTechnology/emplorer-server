import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type {
  AuthTokenResponse,
  ForgotPasswordResponse,
  LinkedInOAuthUser,
  MessageResponse,
  SendVerificationEmailResponse,
} from './auth.types';
import {
  ForgotPasswordDto,
  LoginAuthDto,
  ResetPasswordDto,
  SendVerificationEmailDto,
  VerifyEmailDto,
} from './dto';
import { LinkedInAuthGuard } from './guards';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipAuth } from './decorators/skip-auth.decorator';

@ApiTags('auth')
@SkipAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login an existing user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  login(@Body() loginAuthDto: LoginAuthDto): Promise<AuthTokenResponse> {
    return this.authService.login(loginAuthDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send a password reset OTP to the user' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset the user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponse> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('send-verification-email')
  @ApiOperation({
    summary: 'Send (or resend) an email verification OTP to the user',
  })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendVerificationEmail(
    @Body() sendVerificationEmailDto: SendVerificationEmailDto,
  ): Promise<SendVerificationEmailResponse> {
    return this.authService.sendVerificationEmail(sendVerificationEmailDto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify the user email address with an OTP' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<MessageResponse> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Get('linkedin')
  @ApiOperation({ summary: 'Initiate LinkedIn OAuth flow' })
  @UseGuards(LinkedInAuthGuard)
  linkedInLogin(): void {
    // Initiates LinkedIn OAuth flow — handled by Passport
  }

  @Get('linkedin/callback')
  @ApiOperation({ summary: 'LinkedIn OAuth callback' })
  @UseGuards(LinkedInAuthGuard)
  async linkedInCallback(@Req() req: Request): Promise<AuthTokenResponse> {
    const oauthUser = req.user as LinkedInOAuthUser;

    return this.authService.findOrCreateUserFromLinkedin(oauthUser);
  }
}

import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type {
  AuthTokenResponse,
  ForgotPasswordResponse,
  LinkedInOAuthUser,
  MessageResponse,
} from './auth.types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
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

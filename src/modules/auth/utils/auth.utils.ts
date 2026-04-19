import type { Request } from 'express';
import type { JwtPayload } from '../auth.types';

export const AUTH_RESPONSE_MESSAGES = {
  passwordReset: 'Password reset successful.',
  invalidResetOtp: 'Invalid or expired OTP.',
} as const;

export type RequestWithJwtUser = Request & { user?: JwtPayload };

export const ExtractTokenFromHeader = (
  request: Request,
): string | undefined => {
  const authHeader = request.headers.authorization;

  if (typeof authHeader !== 'string') {
    return undefined;
  }

  const [type, token] = authHeader.split(' ');
  return type === 'Bearer' ? token : undefined;
};

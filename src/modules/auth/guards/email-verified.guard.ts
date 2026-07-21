import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  CanActivate,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../shared/modules/prisma';
import type { JwtPayload } from '../auth.types';

const EMAIL_NOT_VERIFIED_MESSAGE =
  'Please verify your email address before performing this action.';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException(EMAIL_NOT_VERIFIED_MESSAGE);
    }

    const dbUser = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email_verified_at: true },
    });

    if (!dbUser?.email_verified_at) {
      throw new ForbiddenException(EMAIL_NOT_VERIFIED_MESSAGE);
    }

    return true;
  }
}

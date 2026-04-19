import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/skip-auth.decorator';
import {
  ExtractTokenFromHeader,
  RequestWithJwtUser,
} from '../utils/auth.utils';

const isJwtPayload = (value: string | jwt.JwtPayload): value is JwtPayload => {
  return typeof value !== 'string' && typeof value.sub === 'string';
};

@Injectable()
export class UserInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithJwtUser>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    try {
      if (isPublic) return next.handle();

      const token = ExtractTokenFromHeader(request);
      if (!token) return next.handle();

      const user = jwt.verify(
        token,
        this.configService.getOrThrow<string>('JWT_SECRET'),
      );

      if (!isJwtPayload(user)) {
        throw new UnauthorizedException({
          message: 'invalid or expired token',
        });
      }

      request.user = user;
      return next.handle();
    } catch {
      throw new UnauthorizedException({ message: 'invalid or expired token' });
    }
  }
}

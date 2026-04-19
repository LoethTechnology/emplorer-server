import { AuthenticatedRequest } from '@modules/user/user.types';
import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const User = createParamDecorator((_data, context: ExecutionContext) => {
  const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return req.user;
});

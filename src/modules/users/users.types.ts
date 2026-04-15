import type { Request } from 'express';
import type { user } from 'prisma/generated/prisma/client';
import type { ApiSuccessResponse } from '../../shared/utils/response/response.utils';
import type { JwtPayload } from '../auth/auth.types';

export type PublicUser = Omit<user, 'password'>;

export type AuthenticatedRequest = Request & { user: JwtPayload };

export interface UserWithPassword {
  id: string;
  email: string | null;
  password: string | null;
  deleted_at: Date | null;
}

export type UserResponse = ApiSuccessResponse<PublicUser>;

export type UsersMessageResponse = ApiSuccessResponse<string>;

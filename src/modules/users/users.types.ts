import type { Request } from 'express';
import type { user } from 'prisma/generated/prisma/client';
import type { JwtPayload } from '../auth/auth.types';

export type PublicUser = Omit<user, 'password'>;

export type AuthenticatedRequest = Request & { user: JwtPayload };

export interface UserWithPassword {
  id: string;
  email: string | null;
  password: string | null;
  deleted_at: Date | null;
}

export interface UsersMessageResponse {
  message: string;
}

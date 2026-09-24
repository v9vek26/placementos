import type { Request } from 'express';
import type { Role } from '../generated/prisma/enums.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

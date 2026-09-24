import { SetMetadata } from '@nestjs/common';
import type { Role } from '../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

/** Method roles override any controller-level roles. Use after JwtAuthGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

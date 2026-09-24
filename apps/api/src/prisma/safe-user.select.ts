import type { Prisma } from '../generated/prisma/client.js';
/** Public identity fields only; never include passwordHash in API relations. */
export const safeUserSelect = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

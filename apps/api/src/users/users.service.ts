import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

import { safeUserSelect } from '../prisma/safe-user.select.js';
import type { AuthenticatedUser } from '../auth/authenticated-request.js';
import type { Prisma } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data,
        select: safeUserSelect,
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };

      if (prismaError.code === 'P2002') {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: safeUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, data: UpdateUserDto, actor: AuthenticatedUser) {
    if (
      id === actor.userId &&
      data.role !== undefined &&
      data.role !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'You cannot change your own administrator role.',
      );
    }
    return this.manageUser(id, actor, async (tx, currentRole) => {
      if (
        currentRole === Role.ADMIN &&
        data.role !== undefined &&
        data.role !== Role.ADMIN
      ) {
        await this.requireAnotherAdmin(tx);
      }
      return tx.user.update({ where: { id }, data, select: safeUserSelect });
    });
  }

  async remove(id: string, actor: AuthenticatedUser) {
    if (id === actor.userId) {
      throw new ForbiddenException(
        'You cannot delete your own administrator account.',
      );
    }
    return this.manageUser(id, actor, async (tx, currentRole) => {
      if (currentRole === Role.ADMIN) await this.requireAnotherAdmin(tx);
      return tx.user.delete({ where: { id }, select: safeUserSelect });
    });
  }

  private async requireAnotherAdmin(tx: Prisma.TransactionClient) {
    if ((await tx.user.count({ where: { role: Role.ADMIN } })) <= 1) {
      throw new ConflictException(
        'The last administrator cannot be removed or demoted.',
      );
    }
  }

  private async manageUser<T>(
    id: string,
    actor: AuthenticatedUser,
    write: (tx: Prisma.TransactionClient, currentRole: Role) => Promise<T>,
  ) {
    try {
      // Recheck authority inside the transaction: concurrent demotions must not
      // allow two administrators to remove each other's access using stale JWTs.
      return await this.prisma.$transaction(
        async (tx) => {
          const administrator = await tx.user.findUnique({
            where: { id: actor.userId },
            select: { role: true },
          });
          if (administrator?.role !== Role.ADMIN)
            throw new ForbiddenException();
          const user = await tx.user.findUnique({
            where: { id },
            select: { role: true },
          });
          if (!user) throw new NotFoundException('User not found');
          return write(tx, user.role);
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'P2002')
        throw new ConflictException('A user with this email already exists');
      if (code === 'P2034')
        throw new ConflictException(
          'Access changed concurrently. Refresh and try again.',
        );
      if (code === 'P2025') throw new NotFoundException('User not found');
      throw error;
    }
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

import { safeUserSelect } from '../prisma/safe-user.select.js';

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

  async update(id: string, data: UpdateUserDto) {
    await this.findOne(id);

    try {
      return await this.prisma.user.update({
        where: {
          id,
        },
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

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: {
        id,
      },
      select: safeUserSelect,
    });
  }
}

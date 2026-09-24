import type { AuthenticatedUser } from '../auth/authenticated-request.js';
import { Role } from '../generated/prisma/enums.js';
import { safeUserSelect } from '../prisma/safe-user.select.js';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';

@Injectable()
export class StudentProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStudentProfileDto, actor: AuthenticatedUser) {
    if (
      actor.role !== Role.ADMIN &&
      (actor.role !== Role.STUDENT || data.userId !== actor.userId)
    )
      throw new ForbiddenException();
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'STUDENT') {
      throw new BadRequestException(
        'Only student users can have a student profile',
      );
    }

    try {
      return await this.prisma.studentProfile.create({
        data,
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };

      if (prismaError.code === 'P2002') {
        throw new ConflictException(
          'A student profile or roll number already exists',
        );
      }

      throw error;
    }
  }

  async findAll(actor: AuthenticatedUser) {
    return this.prisma.studentProfile.findMany({
      where: this.scope(actor),
      include: {
        user: { select: safeUserSelect },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const profile = await this.prisma.studentProfile.findFirst({
      where: {
        ...this.scope(actor),
        id,
      },
      include: {
        user: { select: safeUserSelect },
      },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    return profile;
  }

  async update(
    id: string,
    data: UpdateStudentProfileDto,
    actor: AuthenticatedUser,
  ) {
    await this.findOne(id, actor);

    try {
      return await this.prisma.studentProfile.update({
        where: {
          ...this.scope(actor),
          id,
        },
        data,
        include: {
          user: { select: safeUserSelect },
        },
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };

      if (prismaError.code === 'P2002') {
        throw new ConflictException(
          'A student profile with this roll number already exists',
        );
      }

      throw error;
    }
  }

  async remove(id: string, actor: AuthenticatedUser) {
    await this.findOne(id, actor);

    return this.prisma.studentProfile.delete({
      where: {
        ...this.scope(actor),
        id,
      },
    });
  }

  private scope(actor: AuthenticatedUser): { userId?: string } {
    if (actor.role === Role.ADMIN) return {};
    if (actor.role === Role.STUDENT) return { userId: actor.userId };
    throw new ForbiddenException();
  }
}

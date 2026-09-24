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
import { CreateRecruiterProfileDto } from './dto/create-recruiter-profile.dto.js';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto.js';

@Injectable()
export class RecruitersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRecruiterProfileDto, actor: AuthenticatedUser) {
    if (actor.role !== Role.ADMIN) throw new ForbiddenException();
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'RECRUITER') {
      throw new BadRequestException(
        'Only recruiter users can have a recruiter profile',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: {
        id: data.companyId,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    try {
      return await this.prisma.recruiterProfile.create({
        data,
        include: {
          user: { select: safeUserSelect },
          company: true,
        },
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };

      if (prismaError.code === 'P2002') {
        throw new ConflictException(
          'A recruiter profile already exists for this user',
        );
      }

      throw error;
    }
  }

  async findAll(actor: AuthenticatedUser) {
    return this.prisma.recruiterProfile.findMany({
      where: this.scope(actor),
      include: {
        user: { select: safeUserSelect },
        company: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const recruiter = await this.prisma.recruiterProfile.findFirst({
      where: {
        ...this.scope(actor),
        id,
      },
      include: {
        user: { select: safeUserSelect },
        company: true,
      },
    });

    if (!recruiter) {
      throw new NotFoundException('Recruiter profile not found');
    }

    return recruiter;
  }

  async update(
    id: string,
    data: UpdateRecruiterProfileDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.role !== Role.ADMIN && data.companyId !== undefined)
      throw new ForbiddenException(
        'Only admins may change company membership.',
      );
    await this.findOne(id, actor);

    if (data.companyId) {
      const company = await this.prisma.company.findUnique({
        where: {
          id: data.companyId,
        },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }
    }

    return this.prisma.recruiterProfile.update({
      where: {
        ...this.scope(actor),
        id,
      },
      data,
      include: {
        user: { select: safeUserSelect },
        company: true,
      },
    });
  }

  async remove(id: string, actor: AuthenticatedUser) {
    if (actor.role !== Role.ADMIN) throw new ForbiddenException();
    await this.findOne(id, actor);

    return this.prisma.recruiterProfile.delete({
      where: {
        ...this.scope(actor),
        id,
      },
    });
  }

  private scope(actor: AuthenticatedUser): { userId?: string } {
    if (actor.role === Role.ADMIN) return {};
    if (actor.role === Role.RECRUITER) return { userId: actor.userId };
    throw new ForbiddenException();
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/authenticated-request.js';
import { Role } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EligibilityService } from '../eligibility/eligibility.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: EligibilityService,
  ) {}

  async create(data: CreateApplicationDto, user: AuthenticatedUser) {
    if (user.role !== Role.STUDENT) throw new ForbiddenException();
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!profile || profile.id !== data.studentProfileId) {
      throw new ForbiddenException(
        'You may only apply with your own student profile.',
      );
    }
    const eligibility = await this.eligibilityService.check(
      {
        studentProfileId: profile.id,
        jobId: data.jobId,
      },
      user,
    );

    if (!eligibility.eligible) {
      throw new BadRequestException({
        message: 'Student is not eligible for this opportunity.',
        reasons: eligibility.reasons,
      });
    }

    const existingApplication = await this.prisma.application.findUnique({
      where: {
        studentProfileId_jobId: {
          studentProfileId: profile.id,
          jobId: data.jobId,
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'Student has already applied to this opportunity.',
      );
    }

    return this.prisma.application.create({
      data: {
        studentProfileId: profile.id,
        jobId: data.jobId,
      },
      include: {
        studentProfile: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.application.findMany({
      where: this.visibleTo(user),
      include: {
        studentProfile: true,
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const application = await this.prisma.application.findFirst({
      where: {
        ...this.visibleTo(user),
        id,
      },
      include: {
        studentProfile: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async updateStatus(
    id: string,
    data: UpdateApplicationStatusDto,
    user: AuthenticatedUser,
  ) {
    if (user.role !== Role.RECRUITER && user.role !== Role.ADMIN)
      throw new ForbiddenException();
    await this.findOne(id, user);

    return this.prisma.application.update({
      where: {
        ...this.visibleTo(user),
        id,
      },
      data: {
        status: data.status,
      },
      include: {
        studentProfile: true,
        job: {
          include: {
            company: true,
          },
        },
      },
    });
  }
  private visibleTo(user: AuthenticatedUser): Prisma.ApplicationWhereInput {
    switch (user.role) {
      case Role.STUDENT:
        return { studentProfile: { userId: user.userId } };
      case Role.RECRUITER:
        return { job: { recruiter: { userId: user.userId } } };
      case Role.ADMIN:
        return {};
      default:
        throw new ForbiddenException();
    }
  }
}

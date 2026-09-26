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
    try {
      return await this.prisma.$transaction(
        async (database) => {
          // Shared row locks permit parallel applications, but hold profile edits,
          // job closure and deletion until commit. Always lock profile before job.
          const profiles = await database.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "StudentProfile"
          WHERE "id" = ${data.studentProfileId} AND "userId" = ${user.userId}
          FOR SHARE
        `;
          if (!profiles.length) {
            throw new ForbiddenException(
              'You may only apply with your own student profile.',
            );
          }
          await database.$queryRaw`
          SELECT "id" FROM "Job" WHERE "id" = ${data.jobId} FOR SHARE
        `;
          const eligibility = await this.eligibilityService.check(
            data,
            user,
            database,
          );
          if (!eligibility.eligible) {
            throw new BadRequestException({
              message: 'Student is not eligible for this opportunity.',
              reasons: eligibility.reasons,
            });
          }
          const existingApplication = await database.application.findUnique({
            where: {
              studentProfileId_jobId: {
                studentProfileId: data.studentProfileId,
                jobId: data.jobId,
              },
            },
          });
          if (existingApplication) {
            throw new ConflictException(
              'Student has already applied to this opportunity.',
            );
          }
          return database.application.create({
            data: {
              studentProfileId: data.studentProfileId,
              jobId: data.jobId,
            },
            include: {
              studentProfile: true,
              job: { include: { company: true } },
            },
          });
        },
        { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 10000 },
      );
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'P2002') {
        throw new ConflictException(
          'Student has already applied to this opportunity.',
        );
      }
      if (code === 'P2034' || code === 'P2028') {
        throw new ConflictException(
          'The opportunity or profile changed while applying. Refresh and try again.',
        );
      }
      throw error;
    }
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

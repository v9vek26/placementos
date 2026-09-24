import type { AuthenticatedUser } from '../auth/authenticated-request.js';
import type { Prisma } from '../generated/prisma/client.js';
import { Role, JobStatus } from '../generated/prisma/enums.js';
import { safeUserSelect } from '../prisma/safe-user.select.js';
import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateJobDto, actor: AuthenticatedUser) {
    this.scope(actor, true);
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: {
        id: data.recruiterId,
      },
      include: {
        company: true,
      },
    });

    if (!recruiter) {
      throw new NotFoundException('Recruiter profile not found');
    }

    if (actor.role === Role.RECRUITER && recruiter.userId !== actor.userId)
      throw new ForbiddenException('You may only post jobs as yourself.');

    this.validateCompensation(data.compensationMin, data.compensationMax);

    const { recruiterId, applicationDeadline, ...jobData } = data;

    return this.prisma.job.create({
      data: {
        ...jobData,
        recruiterId,
        companyId: recruiter.companyId,
        applicationDeadline: applicationDeadline
          ? applicationDeadline === null
            ? null
            : new Date(applicationDeadline)
          : undefined,
      },
      include: {
        company: true,
        recruiter: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
    });
  }

  async findAll(actor: AuthenticatedUser) {
    return this.prisma.job.findMany({
      where: this.scope(actor),
      include: {
        company: true,
        recruiter: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser, forWrite = false) {
    const job = await this.prisma.job.findFirst({
      where: {
        ...this.scope(actor, forWrite),
        id,
      },
      include: {
        company: true,
        recruiter: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async update(id: string, data: UpdateJobDto, actor: AuthenticatedUser) {
    const existingJob = await this.findOne(id, actor, true);

    const compensationMin =
      data.compensationMin !== undefined
        ? data.compensationMin
        : existingJob.compensationMin;

    const compensationMax =
      data.compensationMax !== undefined
        ? data.compensationMax
        : existingJob.compensationMax;

    this.validateCompensation(compensationMin, compensationMax);

    const { applicationDeadline, ...jobData } = data;

    return this.prisma.job.update({
      where: {
        ...this.scope(actor, true),
        id,
      },
      data: {
        ...jobData,
        applicationDeadline:
          applicationDeadline !== undefined
            ? applicationDeadline === null
              ? null
              : new Date(applicationDeadline)
            : undefined,
      },
      include: {
        company: true,
        recruiter: {
          include: {
            user: { select: safeUserSelect },
          },
        },
      },
    });
  }

  async remove(id: string, actor: AuthenticatedUser) {
    await this.findOne(id, actor, true);

    return this.prisma.job.delete({
      where: {
        ...this.scope(actor, true),
        id,
      },
    });
  }

  private validateCompensation(
    minimum?: number | null,
    maximum?: number | null,
  ) {
    if (minimum != null && maximum != null && minimum > maximum) {
      throw new BadRequestException(
        'Minimum compensation cannot be greater than maximum compensation',
      );
    }
  }

  private scope(
    actor: AuthenticatedUser,
    forWrite = false,
  ): Prisma.JobWhereInput {
    if (actor.role === Role.ADMIN) return {};
    if (actor.role === Role.RECRUITER) {
      const own = { recruiter: { userId: actor.userId } };
      return forWrite ? own : { OR: [own, { status: JobStatus.OPEN }] };
    }
    if (actor.role === Role.STUDENT && !forWrite)
      return { status: JobStatus.OPEN };
    throw new ForbiddenException();
  }
}

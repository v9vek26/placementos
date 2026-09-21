import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateJobDto) {
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

    this.validateCompensation(
      data.compensationMin,
      data.compensationMax,
    );

    const {
      recruiterId,
      applicationDeadline,
      ...jobData
    } = data;

    return this.prisma.job.create({
      data: {
        ...jobData,
        recruiterId,
        companyId: recruiter.companyId,
        applicationDeadline: applicationDeadline
          ? new Date(applicationDeadline)
          : undefined,
      },
      include: {
        company: true,
        recruiter: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.job.findMany({
      include: {
        company: true,
        recruiter: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: {
        id,
      },
      include: {
        company: true,
        recruiter: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async update(id: string, data: UpdateJobDto) {
    const existingJob = await this.findOne(id);

    const compensationMin =
      data.compensationMin ?? existingJob.compensationMin ?? undefined;

    const compensationMax =
      data.compensationMax ?? existingJob.compensationMax ?? undefined;

    this.validateCompensation(
      compensationMin,
      compensationMax,
    );

    const {
      applicationDeadline,
      ...jobData
    } = data;

    return this.prisma.job.update({
      where: {
        id,
      },
      data: {
        ...jobData,
        applicationDeadline:
          applicationDeadline !== undefined
            ? new Date(applicationDeadline)
            : undefined,
      },
      include: {
        company: true,
        recruiter: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.job.delete({
      where: {
        id,
      },
    });
  }

  private validateCompensation(
    minimum?: number,
    maximum?: number,
  ) {
    if (
      minimum !== undefined &&
      maximum !== undefined &&
      minimum > maximum
    ) {
      throw new BadRequestException(
        'Minimum compensation cannot be greater than maximum compensation',
      );
    }
  }
}
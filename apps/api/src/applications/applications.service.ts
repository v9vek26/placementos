import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

  async create(data: CreateApplicationDto) {
    const eligibility = await this.eligibilityService.check({
      studentProfileId: data.studentProfileId,
      jobId: data.jobId,
    });

    if (!eligibility.eligible) {
      throw new BadRequestException({
        message: 'Student is not eligible for this opportunity.',
        reasons: eligibility.reasons,
      });
    }

    const existingApplication = await this.prisma.application.findUnique({
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

    return this.prisma.application.create({
      data: {
        studentProfileId: data.studentProfileId,
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

  async findAll() {
    return this.prisma.application.findMany({
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

  async findOne(id: string) {
    const application = await this.prisma.application.findUnique({
      where: {
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
  ) {
    await this.findOne(id);

    return this.prisma.application.update({
      where: {
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
}
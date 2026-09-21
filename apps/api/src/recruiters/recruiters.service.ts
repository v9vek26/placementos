import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRecruiterProfileDto } from './dto/create-recruiter-profile.dto.js';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto.js';

@Injectable()
export class RecruitersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRecruiterProfileDto) {
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
          user: true,
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

  async findAll() {
    return this.prisma.recruiterProfile.findMany({
      include: {
        user: true,
        company: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const recruiter = await this.prisma.recruiterProfile.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        company: true,
      },
    });

    if (!recruiter) {
      throw new NotFoundException('Recruiter profile not found');
    }

    return recruiter;
  }

  async update(id: string, data: UpdateRecruiterProfileDto) {
    await this.findOne(id);

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
        id,
      },
      data,
      include: {
        user: true,
        company: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.recruiterProfile.delete({
      where: {
        id,
      },
    });
  }
}
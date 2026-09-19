import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto.js';

@Injectable()
export class StudentProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateStudentProfileDto) {
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

  async findAll() {
    return this.prisma.studentProfile.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    return profile;
  }
}
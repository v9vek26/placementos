import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCompanyDto) {
    try {
      return await this.prisma.company.create({
        data,
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };

      if (prismaError.code === 'P2002') {
        throw new ConflictException('A company with this name already exists');
      }

      throw error;
    }
  }

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: {
        id,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, data: UpdateCompanyDto) {
    await this.findOne(id);

    try {
      return await this.prisma.company.update({
        where: {
          id,
        },
        data,
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };

      if (prismaError.code === 'P2002') {
        throw new ConflictException('A company with this name already exists');
      }

      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.company.delete({
      where: {
        id,
      },
    });
  }
}

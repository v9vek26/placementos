import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    const userCount = await this.prisma.user.count();

    return {
      status: 'ok',
      database: 'connected',
      users: userCount,
    };
  }
}
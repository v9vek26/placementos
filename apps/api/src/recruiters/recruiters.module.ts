import { Module } from '@nestjs/common';
import { RecruitersService } from './recruiters.service.js';
import { RecruitersController } from './recruiters.controller.js';

@Module({
  providers: [RecruitersService],
  controllers: [RecruitersController]
})
export class RecruitersModule {}

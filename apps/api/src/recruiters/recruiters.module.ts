import { AuthModule } from '../auth/auth.module.js';
import { Module } from '@nestjs/common';
import { RecruitersService } from './recruiters.service.js';
import { RecruitersController } from './recruiters.controller.js';

@Module({
  imports: [AuthModule],
  providers: [RecruitersService],
  controllers: [RecruitersController],
})
export class RecruitersModule {}

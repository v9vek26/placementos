import { AuthModule } from '../auth/auth.module.js';
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { JobsController } from './jobs.controller.js';

@Module({
  imports: [AuthModule],
  providers: [JobsService],
  controllers: [JobsController],
})
export class JobsModule {}

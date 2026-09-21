import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service.js';
import { JobsController } from './jobs.controller.js';

@Module({
  providers: [JobsService],
  controllers: [JobsController]
})
export class JobsModule {}

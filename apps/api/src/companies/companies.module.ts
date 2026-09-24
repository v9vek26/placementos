import { AuthModule } from '../auth/auth.module.js';
import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import { CompaniesController } from './companies.controller.js';

@Module({
  imports: [AuthModule],
  providers: [CompaniesService],
  controllers: [CompaniesController],
})
export class CompaniesModule {}

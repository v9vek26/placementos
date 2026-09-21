import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import { CompaniesController } from './companies.controller.js';

@Module({
  providers: [CompaniesService],
  controllers: [CompaniesController]
})
export class CompaniesModule {}

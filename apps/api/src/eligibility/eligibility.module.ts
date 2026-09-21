import { Module } from '@nestjs/common';
import { EligibilityService } from './eligibility.service.js';
import { EligibilityController } from './eligibility.controller.js';

@Module({
  providers: [EligibilityService],
  controllers: [EligibilityController]
})
export class EligibilityModule {}

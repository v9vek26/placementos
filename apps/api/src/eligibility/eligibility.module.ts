import { AuthModule } from '../auth/auth.module.js';
import { Module } from '@nestjs/common';

import { EligibilityController } from './eligibility.controller.js';
import { EligibilityService } from './eligibility.service.js';

@Module({
  imports: [AuthModule],
  controllers: [EligibilityController],
  providers: [EligibilityService],
  exports: [EligibilityService],
})
export class EligibilityModule {}

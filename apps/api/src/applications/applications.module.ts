import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { EligibilityModule } from '../eligibility/eligibility.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

@Module({
  imports: [AuthModule, EligibilityModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}

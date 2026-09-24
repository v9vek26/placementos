import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../generated/prisma/enums.js';
import { EligibilityService } from './eligibility.service.js';
import { CheckEligibilityDto } from './dto/check-eligibility.dto.js';
@Controller('eligibility')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.RECRUITER, Role.ADMIN)
export class EligibilityController {
  constructor(private readonly service: EligibilityService) {}
  @Post('check')
  async check(
    @Body() data: CheckEligibilityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.check(data, request.user);
  }
}

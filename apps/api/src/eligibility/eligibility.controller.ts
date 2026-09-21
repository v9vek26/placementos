import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { EligibilityService } from './eligibility.service.js';
import { CheckEligibilityDto } from './dto/check-eligibility.dto.js';

@Controller('eligibility')
export class EligibilityController {
  constructor(
    private readonly eligibilityService: EligibilityService,
  ) {}

  @Post('check')
  async check(@Body() data: CheckEligibilityDto) {
    return this.eligibilityService.check(data);
  }
}
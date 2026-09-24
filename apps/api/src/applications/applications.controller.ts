import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../generated/prisma/enums.js';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.RECRUITER, Role.ADMIN)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(Role.STUDENT)
  async create(
    @Body() data: CreateApplicationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.applicationsService.create(data, request.user);
  }

  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    return this.applicationsService.findAll(request.user);
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.applicationsService.findOne(id, request.user);
  }

  @Patch(':id/status')
  @Roles(Role.RECRUITER, Role.ADMIN)
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateApplicationStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.applicationsService.updateStatus(id, data, request.user);
  }
}

import {
  Body,
  Controller,
  Delete,
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
import { JobsService } from './jobs.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.RECRUITER, Role.ADMIN)
export class JobsController {
  constructor(private readonly service: JobsService) {}
  @Post()
  @Roles(Role.RECRUITER, Role.ADMIN)
  async create(
    @Body() data: CreateJobDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.create(data, request.user);
  }
  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    return this.service.findAll(request.user);
  }
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, request.user);
  }
  @Patch(':id')
  @Roles(Role.RECRUITER, Role.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateJobDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.update(id, data, request.user);
  }
  @Delete(':id')
  @Roles(Role.RECRUITER, Role.ADMIN)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.remove(id, request.user);
  }
}

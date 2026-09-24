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
import { RecruitersService } from './recruiters.service.js';
import { CreateRecruiterProfileDto } from './dto/create-recruiter-profile.dto.js';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto.js';

@Controller('recruiters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RECRUITER, Role.ADMIN)
export class RecruitersController {
  constructor(private readonly service: RecruitersService) {}
  @Post()
  @Roles(Role.ADMIN)
  async create(
    @Body() data: CreateRecruiterProfileDto,
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
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateRecruiterProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.update(id, data, request.user);
  }
  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.remove(id, request.user);
  }
}

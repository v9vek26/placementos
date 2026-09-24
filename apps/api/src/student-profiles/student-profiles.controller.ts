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
import { StudentProfilesService } from './student-profiles.service.js';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';

@Controller('student-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.ADMIN)
export class StudentProfilesController {
  constructor(private readonly service: StudentProfilesService) {}
  @Post()
  async create(
    @Body() data: CreateStudentProfileDto,
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
    @Body() data: UpdateStudentProfileDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.update(id, data, request.user);
  }
  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.remove(id, request.user);
  }
}

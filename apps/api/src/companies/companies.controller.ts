import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Role } from '../generated/prisma/enums.js';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.RECRUITER, Role.ADMIN)
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}
  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() data: CreateCompanyDto) {
    return this.service.create(data);
  }
  @Get()
  async findAll() {
    return this.service.findAll();
  }
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id);
  }
  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateCompanyDto,
  ) {
    return this.service.update(id, data);
  }
  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.remove(id);
  }
}

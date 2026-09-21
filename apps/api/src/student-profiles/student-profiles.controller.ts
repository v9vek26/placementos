import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { StudentProfilesService } from './student-profiles.service.js';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto.js';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto.js';

@Controller('student-profiles')
export class StudentProfilesController {
  constructor(
    private readonly studentProfilesService: StudentProfilesService,
  ) {}

  @Post()
  async create(@Body() data: CreateStudentProfileDto) {
    return this.studentProfilesService.create(data);
  }

  @Get()
  async findAll() {
    return this.studentProfilesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.studentProfilesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateStudentProfileDto,
  ) {
    return this.studentProfilesService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.studentProfilesService.remove(id);
  }
}
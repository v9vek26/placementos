import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { RecruitersService } from './recruiters.service.js';
import { CreateRecruiterProfileDto } from './dto/create-recruiter-profile.dto.js';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto.js';

@Controller('recruiters')
export class RecruitersController {
  constructor(
    private readonly recruitersService: RecruitersService,
  ) {}

  @Post()
  async create(@Body() data: CreateRecruiterProfileDto) {
    return this.recruitersService.create(data);
  }

  @Get()
  async findAll() {
    return this.recruitersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.recruitersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateRecruiterProfileDto,
  ) {
    return this.recruitersService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.recruitersService.remove(id);
  }
}
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Post()
  async create(@Body() data: CreateApplicationDto) {
    return this.applicationsService.create(data);
  }

  @Get()
  async findAll() {
    return this.applicationsService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, data);
  }
}
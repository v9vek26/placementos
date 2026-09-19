import { Module } from '@nestjs/common';
import { StudentProfilesService } from './student-profiles.service.js';
import { StudentProfilesController } from './student-profiles.controller.js';

@Module({
  providers: [StudentProfilesService],
  controllers: [StudentProfilesController]
})
export class StudentProfilesModule {}

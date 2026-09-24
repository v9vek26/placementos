import { AuthModule } from '../auth/auth.module.js';
import { Module } from '@nestjs/common';
import { StudentProfilesService } from './student-profiles.service.js';
import { StudentProfilesController } from './student-profiles.controller.js';

@Module({
  imports: [AuthModule],
  providers: [StudentProfilesService],
  controllers: [StudentProfilesController],
})
export class StudentProfilesModule {}

import { AuthModule } from '../auth/auth.module.js';
import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [AuthModule],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}

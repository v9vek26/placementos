import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

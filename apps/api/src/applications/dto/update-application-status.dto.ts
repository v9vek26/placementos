import { IsEnum } from 'class-validator';

import { ApplicationStatus } from '../../generated/prisma/enums.js';

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status!: ApplicationStatus;
}
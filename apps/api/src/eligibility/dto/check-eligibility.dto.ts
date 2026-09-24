import { IsUUID } from 'class-validator';

export class CheckEligibilityDto {
  @IsUUID()
  studentProfileId!: string;

  @IsUUID()
  jobId!: string;
}

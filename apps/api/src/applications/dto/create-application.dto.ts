import { IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  studentProfileId!: string;

  @IsUUID()
  jobId!: string;
}
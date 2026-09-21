import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import {
  CompensationPeriod,
  JobStatus,
  JobType,
  WorkMode,
} from '../../generated/prisma/enums.js';

export class CreateJobDto {
  @IsUUID()
  recruiterId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(JobType)
  type!: JobType;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  compensationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compensationMax?: number;

  @IsOptional()
  @IsString()
  compensationCurrency?: string;

  @IsOptional()
  @IsEnum(CompensationPeriod)
  compensationPeriod?: CompensationPeriod;

  @IsOptional()
  @Min(0)
  @Max(10)
  minCgpa?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxActiveBacklogs?: number;

  @IsOptional()
  @Min(0)
  @Max(100)
  minTenthPercentage?: number;

  @IsOptional()
  @Min(0)
  @Max(100)
  minTwelfthPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleBranches?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  graduationYears?: number[];

  @IsOptional()
  @IsISO8601()
  applicationDeadline?: string;
}
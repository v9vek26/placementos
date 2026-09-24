import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import {
  CompensationPeriod,
  JobStatus,
  JobType,
  WorkMode,
} from '../../generated/prisma/enums.js';

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  compensationMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  compensationMax?: number | null;

  @IsOptional()
  @IsString()
  compensationCurrency?: string;

  @IsOptional()
  @IsEnum(CompensationPeriod)
  compensationPeriod?: CompensationPeriod | null;

  @IsOptional()
  @Min(0)
  @Max(10)
  minCgpa?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxActiveBacklogs?: number | null;

  @IsOptional()
  @Min(0)
  @Max(100)
  minTenthPercentage?: number | null;

  @IsOptional()
  @Min(0)
  @Max(100)
  minTwelfthPercentage?: number | null;

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
  applicationDeadline?: string | null;
}

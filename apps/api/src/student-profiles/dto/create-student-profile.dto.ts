import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateStudentProfileDto {
  @IsString()
  userId!: string;

  @IsString()
  fullName!: string;

  @IsString()
  collegeRollNumber!: string;

  @IsString()
  branch!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  cgpa?: number;

  @IsInt()
  graduationYear!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  activeBacklogs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tenthPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  twelfthPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsUrl()
  resumeUrl?: string;
}

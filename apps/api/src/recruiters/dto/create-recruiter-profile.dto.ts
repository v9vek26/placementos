import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRecruiterProfileDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  companyId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
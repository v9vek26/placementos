import { IsEmail, IsByteLength, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @IsByteLength(0, 72, { message: 'Password must be at most 72 UTF-8 bytes.' })
  password!: string;
}

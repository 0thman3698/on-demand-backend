import { IsEmail, IsString, MinLength, IsOptional, IsPhoneNumber, ValidateIf } from 'class-validator';

export class LoginDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;
}


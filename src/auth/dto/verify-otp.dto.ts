import { IsString, IsNotEmpty, Length, IsEmail, IsPhoneNumber, ValidateIf } from 'class-validator';

export class VerifyOtpDto {
  @ValidateIf((o) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsPhoneNumber()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 6)
  otpCode: string;
}


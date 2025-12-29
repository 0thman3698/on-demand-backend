import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AccountStatusDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string; // Reason for suspension/ban
}

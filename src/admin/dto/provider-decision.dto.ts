import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ProviderDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string; // Rejection reason (optional for approval, recommended for rejection)
}

import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  IsMongoId,
  IsBoolean,
} from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number; // Duration in minutes

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


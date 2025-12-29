import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsMongoId,
} from 'class-validator';

export class CreateServiceDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  duration: number; // Duration in minutes

  @IsNotEmpty()
  @IsMongoId()
  categoryId: string;
}


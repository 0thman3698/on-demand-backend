import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
  IsBoolean,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


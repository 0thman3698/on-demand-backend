import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WeeklyScheduleDto, ServiceAreaDto } from './create-provider.dto';

export class UpdateProviderDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  services?: string[];

  @IsOptional()
  @IsString()
  expertise?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @IsOptional()
  @IsString()
  idDocument?: string;

  @IsOptional()
  @IsObject()
  pricing?: Record<string, number>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceAreaDto)
  serviceArea?: ServiceAreaDto;
}


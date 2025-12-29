import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityStatus } from '../schemas/provider.schema';

export class DayScheduleDto {
  @IsString()
  start: string; // Format: "HH:mm" (e.g., "09:00")

  @IsString()
  end: string; // Format: "HH:mm" (e.g., "17:00")

  @IsBoolean()
  available: boolean;
}

export class WeeklyScheduleDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  monday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  tuesday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  wednesday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  thursday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  friday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  saturday?: DayScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  sunday?: DayScheduleDto;
}

export class CoordinatesDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class ServiceAreaDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  radius?: number;
}

export class CreateProviderDto {
  @IsArray()
  @IsMongoId({ each: true })
  services: string[]; // Array of service IDs

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
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  weeklySchedule?: WeeklyScheduleDto;

  @IsOptional()
  @IsObject()
  pricing?: Record<string, number>; // serviceId -> price

  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceAreaDto)
  serviceArea?: ServiceAreaDto;

  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;
}

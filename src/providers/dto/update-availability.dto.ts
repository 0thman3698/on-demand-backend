import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AvailabilityStatus } from '../schemas/provider.schema';
import { WeeklyScheduleDto } from './create-provider.dto';

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsEnum(AvailabilityStatus)
  availabilityStatus?: AvailabilityStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  weeklySchedule?: WeeklyScheduleDto;
}

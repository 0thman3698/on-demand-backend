import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  Min,
  IsOptional,
  IsMongoId,
} from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsMongoId()
  providerId: string;

  @IsNotEmpty()
  @IsMongoId()
  serviceId: string;

  @IsNotEmpty()
  @IsDateString()
  scheduledAt: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

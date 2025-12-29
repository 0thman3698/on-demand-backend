import { IsNumber, IsNotEmpty, Min, Max, IsOptional, IsString } from 'class-validator';

export class ProviderLocationDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  bookingId?: string; // If provided, broadcast to booking room
}


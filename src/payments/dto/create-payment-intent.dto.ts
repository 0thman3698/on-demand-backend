import { IsNotEmpty, IsMongoId, IsOptional, IsEnum } from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

export class CreatePaymentIntentDto {
  @IsNotEmpty()
  @IsMongoId()
  bookingId: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}


import { IsNotEmpty, IsString, IsObject, IsOptional, IsEnum } from 'class-validator';
import { PaymentStatus } from '../schemas/payment.schema';

export class PaymentWebhookDto {
  @IsNotEmpty()
  @IsString()
  event: string; // payment.succeeded, payment.failed, etc.

  @IsNotEmpty()
  @IsString()
  paymentIntentId: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  signature?: string; // For webhook signature verification
}


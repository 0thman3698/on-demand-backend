import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  CASH = 'CASH',
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, unique: true })
  bookingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ type: String, enum: PaymentMethod, required: false })
  paymentMethod?: PaymentMethod;

  @Prop({ required: false })
  paymentIntentId?: string; // 3rd-party payment intent ID

  @Prop({ required: false })
  clientSecret?: string; // For frontend payment confirmation

  @Prop({ required: false })
  paymentLink?: string; // Payment link URL

  @Prop({ required: false })
  transactionId?: string; // 3rd-party transaction ID

  @Prop({ required: false })
  provider?: string; // Payment provider (stripe, adyen, paymob)

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>; // Additional payment metadata

  @Prop({ required: false })
  failureReason?: string; // Reason for payment failure

  @Prop({ required: false })
  paidAt?: Date; // When payment was completed

  @Prop({ required: false })
  refundedAt?: Date; // When payment was refunded
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes for performance
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ paymentIntentId: 1 });
PaymentSchema.index({ transactionId: 1 });

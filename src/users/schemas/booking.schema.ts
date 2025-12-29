import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum BookingStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  ON_THE_WAY = 'ON_THE_WAY',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: String, enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ required: true })
  price: number;

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  notes?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Indexes for performance
BookingSchema.index({ userId: 1 });
BookingSchema.index({ providerId: 1 });
BookingSchema.index({ status: 1 });


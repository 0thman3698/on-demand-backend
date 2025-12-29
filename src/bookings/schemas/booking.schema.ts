import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BookingStatus } from '../enums/booking-status.enum';

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  serviceId: Types.ObjectId;

  @Prop({
    type: String,
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  notes?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Indexes for performance
BookingSchema.index({ providerId: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ scheduledAt: 1 });

export { BookingStatus };

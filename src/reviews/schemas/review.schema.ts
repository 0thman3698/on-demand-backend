import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, unique: true })
  bookingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  providerId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: false })
  comment?: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes for performance
ReviewSchema.index({ providerId: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ createdAt: -1 });

// Compound index for provider reviews
ReviewSchema.index({ providerId: 1, createdAt: -1 });

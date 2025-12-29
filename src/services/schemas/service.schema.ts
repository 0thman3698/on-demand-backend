import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Query } from 'mongoose';

@Schema({ timestamps: true })
export class Service extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: true, min: 0 })
  basePrice: number;

  @Prop({ required: true, min: 1 })
  duration: number; // Duration in minutes

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  deletedAt?: Date; // Soft delete timestamp
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Indexes for performance
ServiceSchema.index({ categoryId: 1 });
ServiceSchema.index({ isActive: 1 });
ServiceSchema.index({ deletedAt: 1 });
ServiceSchema.index({ categoryId: 1, isActive: 1 }); // Compound index for common queries
ServiceSchema.index({ basePrice: 1 }); // For sorting by price

// Prevent returning deleted services by default
ServiceSchema.pre(/^find/, function (this: Query<any, any>) {
  if (!this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

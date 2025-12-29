import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({ required: false })
  icon?: string; // Icon URL or identifier

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  deletedAt?: Date; // Soft delete timestamp
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes for performance
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ deletedAt: 1 });
CategorySchema.index({ isActive: 1, deletedAt: 1 }); // Compound index for active categories

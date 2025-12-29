import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  UNAVAILABLE = 'UNAVAILABLE',
}

@Schema({ timestamps: true })
export class Provider extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'Service', default: [] })
  services: Types.ObjectId[];

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({
    type: String,
    enum: AvailabilityStatus,
    default: AvailabilityStatus.AVAILABLE,
  })
  availabilityStatus: AvailabilityStatus;

  @Prop({
    type: {
      monday: { start: String, end: String, available: Boolean },
      tuesday: { start: String, end: String, available: Boolean },
      wednesday: { start: String, end: String, available: Boolean },
      thursday: { start: String, end: String, available: Boolean },
      friday: { start: String, end: String, available: Boolean },
      saturday: { start: String, end: String, available: Boolean },
      sunday: { start: String, end: String, available: Boolean },
    },
    required: false,
  })
  weeklySchedule?: {
    monday?: { start: string; end: string; available: boolean };
    tuesday?: { start: string; end: string; available: boolean };
    wednesday?: { start: string; end: string; available: boolean };
    thursday?: { start: string; end: string; available: boolean };
    friday?: { start: string; end: string; available: boolean };
    saturday?: { start: string; end: string; available: boolean };
    sunday?: { start: string; end: string; available: boolean };
  };

  @Prop({ type: Map, of: Number, default: {} })
  pricing: Map<string, number>; // serviceId -> price

  @Prop({ required: false })
  expertise?: string;

  @Prop({ required: false })
  bio?: string;

  @Prop({ type: [String], default: [] })
  certifications: string[];

  @Prop({ required: false })
  idDocument?: string; // URL or path to ID document

  @Prop({ required: false })
  backgroundCheckStatus?: string;

  @Prop({
    type: {
      address: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      radius: Number, // Service radius in km
    },
    required: false,
  })
  serviceArea?: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    radius?: number;
  };

  @Prop({ default: 0 })
  totalJobs: number;

  @Prop({ default: 0 })
  completedJobs: number;

  @Prop({ required: false })
  rejectionReason?: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const ProviderSchema = SchemaFactory.createForClass(Provider);

// Indexes for performance
ProviderSchema.index({ verified: 1 });
ProviderSchema.index({ availabilityStatus: 1 });
ProviderSchema.index({ 'serviceArea.coordinates': '2dsphere' });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  USER = 'USER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  APPLE = 'APPLE',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: false, unique: true, sparse: true })
  phone?: string;

  // 🔥 المهم هنا
  @Prop({
    required: function () {
      return this.provider === AuthProvider.LOCAL;
    },
    select: false,
  })
  password?: string;

  @Prop({
    type: String,
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ required: false })
  otpCode?: string;

  @Prop({ required: false })
  otpExpiresAt?: Date;

  @Prop({ required: false })
  passwordResetToken?: string;

  @Prop({ required: false })
  passwordResetExpires?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false })
  refreshToken?: string;

  // ✅ Social IDs
  @Prop({ required: false })
  googleId?: string;

  @Prop({ required: false })
  facebookId?: string;

  @Prop({ required: false })
  appleId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

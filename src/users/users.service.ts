import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { Booking } from './schemas/booking.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
  ) {}

  /**
   * Get current user profile (excluding sensitive fields)
   */
  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId).select({
      password: 0,
      refreshToken: 0,
      otpCode: 0,
      otpExpiresAt: 0,
      passwordResetToken: 0,
      passwordResetExpires: 0,
      googleId: 0,
      facebookId: 0,
      appleId: 0,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

  /**
   * Update current user profile
   */
  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const { email, phone, name } = updateUserDto;

    // Check if email is being changed and already exists
    if (email) {
      const existingUserWithEmail = await this.userModel.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUserWithEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    // Check if phone is being changed and already exists
    if (phone) {
      const existingUserWithPhone = await this.userModel.findOne({
        phone,
        _id: { $ne: userId },
      });

      if (existingUserWithPhone) {
        throw new ConflictException('Phone number already in use');
      }
    }

    // Build update object
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone) updateData.phone = phone;

    // Update user
    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select({
        password: 0,
        refreshToken: 0,
        otpCode: 0,
        otpExpiresAt: 0,
        passwordResetToken: 0,
        passwordResetExpires: 0,
        googleId: 0,
        facebookId: 0,
        appleId: 0,
      });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(updatedUser);
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string) {
    const bookings = await this.bookingModel
      .find({ userId })
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name category')
      .sort({ createdAt: -1 })
      .lean();

    return bookings.map((booking: any) => ({
      id: booking._id.toString(),
      provider: booking.providerId,
      service: booking.serviceId,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      price: booking.price,
      address: booking.address,
      notes: booking.notes,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));
  }

  /**
   * Map User document to UserResponseDto
   */
  private mapToUserResponse(user: User): UserResponseDto {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isActive: user.isActive,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }
}

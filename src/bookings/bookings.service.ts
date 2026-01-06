import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking } from './schemas/booking.schema';
import { BookingStatus } from './enums/booking-status.enum';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { User, UserRole } from '../auth/schemas/user.schema';
import { Provider } from '../providers/schemas/provider.schema';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Provider.name) private providerModel: Model<Provider>,
  ) {}

  /**
   * Create a new booking
   * Only USER role can create bookings
   */
  async create(userId: string, createBookingDto: CreateBookingDto) {
    // Verify user exists and has USER role
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.USER) {
      throw new ForbiddenException('Only users can create bookings');
    }

    // Verify provider exists and is verified
    // createBookingDto.providerId is the provider's userId
    const provider = await this.providerModel.findById(
      createBookingDto.providerId,
    );

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (!provider.verified) {
      throw new ForbiddenException('Cannot book with unverified provider');
    }

    // Verify scheduled date is in the future
    const scheduledDate = new Date(createBookingDto.scheduledAt);
    if (scheduledDate < new Date()) {
      throw new BadRequestException('Scheduled date must be in the future');
    }

    // Create booking
    const booking = new this.bookingModel({
      userId: new Types.ObjectId(userId),
      providerId: new Types.ObjectId(createBookingDto.providerId),
      serviceId: new Types.ObjectId(createBookingDto.serviceId),
      scheduledAt: scheduledDate,
      price: createBookingDto.price,
      address: createBookingDto.address,
      notes: createBookingDto.notes,
      status: BookingStatus.PENDING,
    });

    await booking.save();

    // Populate and return
    const populatedBooking = await this.bookingModel
      .findById(booking._id)
      .populate('userId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name category');

    if (!populatedBooking) {
      throw new NotFoundException('Booking not found');
    }

    return populatedBooking;
  }

  /**
   * Get booking by ID
   * User can only access their own bookings
   * Provider can only access bookings assigned to them
   * Admin can access any booking
   */
  async findOne(bookingId: string, userId: string, userRole: UserRole) {
    const booking = await this.bookingModel
      .findById(bookingId)
      .populate('userId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name category');

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check access permissions
    if (userRole === UserRole.ADMIN) {
      // Admin can access any booking
    } else if (userRole === UserRole.USER) {
      // User can only access their own bookings
      if (booking.userId._id.toString() !== userId) {
        throw new ForbiddenException('You can only access your own bookings');
      }
    } else if (userRole === UserRole.PROVIDER) {
      // Provider can only access bookings assigned to them
      const provider = await this.providerModel.findOne({ userId });
      if (!provider) {
        throw new NotFoundException('Provider profile not found');
      }
      const bookingProviderId = booking.providerId._id
        ? booking.providerId._id.toString()
        : booking.providerId.toString();
      if (bookingProviderId !== provider.userId.toString()) {
        throw new ForbiddenException(
          'You can only access bookings assigned to you',
        );
      }
    } else {
      throw new ForbiddenException('Invalid role');
    }

    return booking;
  }

  /**
   * Update booking status
   * Only assigned PROVIDER can update booking status
   * Enforce valid state transitions
   */
  async updateStatus(
    bookingId: string,
    userId: string,
    updateStatusDto: UpdateBookingStatusDto,
  ) {
    const booking = await this.bookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify user is the assigned provider
    const provider = await this.providerModel.findOne({ userId });
    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    if (booking.providerId.toString() !== provider.userId.toString()) {
      throw new ForbiddenException(
        'Only the assigned provider can update booking status',
      );
    }

    // Validate state transition
    this.validateStateTransition(booking.status, updateStatusDto.status);

    // Update status
    booking.status = updateStatusDto.status;
    await booking.save();

    // Populate and return
    const updatedBooking = await this.bookingModel
      .findById(booking._id)
      .populate('userId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name category');
    if (!updatedBooking) {
      throw new NotFoundException('Booking not found');
    }

    return updatedBooking;
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string) {
    const bookings = await this.bookingModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name category')
      .sort({ createdAt: -1 });
    if (!bookings) {
      throw new NotFoundException('Bookings not found');
    }

    return bookings;
  }

  /**
   * Get provider's bookings
   */
  async getProviderBookings(userId: string) {
    // Get provider profile
    const provider = await this.providerModel.findOne({ userId });
    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }
    console.log(provider);

    const bookings = await this.bookingModel
      .find({ providerId: new Types.ObjectId(provider._id) })
      .populate('userId', 'name email phone')
      .populate('providerId', 'name email phone')
      .populate('serviceId', 'name category')
      .sort({ createdAt: -1 });

    if (bookings.length === 0) {
      throw new NotFoundException('Bookings not found');
    }

    return bookings;
  }

  /**
   * Validate state transition
   * Enforces valid state transitions only
   */
  private validateStateTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus,
  ) {
    // If same status, allow (idempotent)
    if (currentStatus === newStatus) {
      return;
    }

    // Define valid transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.ACCEPTED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.ACCEPTED]: [BookingStatus.ON_THE_WAY],
      [BookingStatus.ON_THE_WAY]: [BookingStatus.STARTED],
      [BookingStatus.STARTED]: [BookingStatus.COMPLETED],
      [BookingStatus.COMPLETED]: [], // Terminal state
      [BookingStatus.CANCELLED]: [], // Terminal state
    };

    const allowedStatuses = validTransitions[currentStatus];

    if (!allowedStatuses.includes(newStatus)) {
      throw new ForbiddenException(
        `Invalid state transition: Cannot change from ${currentStatus} to ${newStatus}. ` +
          `Valid transitions from ${currentStatus} are: ${allowedStatuses.join(', ')}`,
      );
    }
  }
}

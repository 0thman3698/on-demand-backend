import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from './schemas/review.schema';
import { Booking, BookingStatus } from '../bookings/schemas/booking.schema';
import { Provider } from '../providers/schemas/provider.schema';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Provider.name) private providerModel: Model<Provider>,
  ) {}

  /**
   * Create a review for a provider
   * Only USER can create reviews
   */
  async create(userId: string, createReviewDto: CreateReviewDto) {
    // Verify booking exists
    const booking = await this.bookingModel.findById(createReviewDto.bookingId);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify booking belongs to the user
    if (booking.userId.toString() !== userId) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    // Verify booking status is COMPLETED
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot review booking with status: ${booking.status}. ` +
          `Booking must be COMPLETED`,
      );
    }

    // Check if review already exists for this booking
    const existingReview = await this.reviewModel.findOne({
      bookingId: createReviewDto.bookingId,
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this booking');
    }

    // Create review
    const review = new this.reviewModel({
      bookingId: new Types.ObjectId(createReviewDto.bookingId),
      userId: new Types.ObjectId(userId),
      providerId: booking.providerId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
    });

    await review.save();

    // Update provider rating
    await this.updateProviderRating(booking.providerId.toString());

    // Populate and return
    const populatedReview = await this.reviewModel
      .findById(review._id)
      .populate('userId', 'name email')
      .populate('providerId', 'name email')
      .populate('bookingId', 'serviceId scheduledAt')
      .lean();

    if (!populatedReview) {
      throw new NotFoundException('Review not found');
    }

    return populatedReview;
  }

  /**
   * Get reviews for a provider
   * Public endpoint - anyone can view provider reviews
   */
  async getProviderReviews(providerId: string) {
    // Verify provider exists
    const provider = await this.providerModel.findOne({ userId: providerId });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Get reviews
    const reviews = await this.reviewModel
      .find({ providerId })
      .populate('userId', 'name email')
      .populate('bookingId', 'serviceId scheduledAt')
      .sort({ createdAt: -1 });

    if (!reviews) {
      throw new NotFoundException('Reviews not found');
    }

    return {
      providerId,
      totalReviews: reviews.length,
      averageRating: provider.rating || 0,
      reviews,
    };
  }

  /**
   * Update provider's average rating based on all reviews
   */
  private async updateProviderRating(providerId: string) {
    // Get all reviews for this provider
    const reviews = await this.reviewModel.find({ providerId }).lean();

    if (reviews.length === 0) {
      return;
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Round to 2 decimal places
    const roundedRating = Math.round(averageRating * 100) / 100;

    // Update provider rating
    await this.providerModel.findOneAndUpdate(
      { userId: providerId },
      {
        $set: {
          rating: roundedRating,
          totalReviews: reviews.length,
        },
      },
    );
  }

  /**
   * Get review by booking ID
   */
  async getReviewByBookingId(bookingId: string) {
    const review = await this.reviewModel
      .findOne({ bookingId })
      .populate('userId', 'name email')
      .populate('providerId', 'name email')
      .populate('bookingId', 'serviceId scheduledAt')
      .lean();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }
}

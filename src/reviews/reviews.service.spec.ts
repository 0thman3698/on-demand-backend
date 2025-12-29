import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ReviewsService } from './reviews.service';
import { Review } from './schemas/review.schema';
import { Booking, BookingStatus } from '../bookings/schemas/booking.schema';
import { Provider } from '../providers/schemas/provider.schema';
import { CreateReviewDto } from './dto/create-review.dto';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewModel: any;
  let bookingModel: any;
  let providerModel: any;

  const mockBooking = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    providerId: new Types.ObjectId('507f1f77bcf86cd799439014'),
    status: BookingStatus.COMPLETED,
  };

  const mockProvider = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439020'),
    rating: 4.5,
    totalReviews: 10,
  };

  const mockReview = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439016'),
    bookingId: new Types.ObjectId('507f1f77bcf86cd799439012'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    providerId: new Types.ObjectId('507f1f77bcf86cd799439014'),
    rating: 5,
    comment: 'Great service',
    save: jest.fn(),
  };

  beforeEach(async () => {
    const MockReviewModel = jest.fn().mockImplementation((doc) => {
      return {
        ...doc,
        save: jest
          .fn()
          .mockResolvedValue({ ...doc, _id: new Types.ObjectId() }),
      };
    });
    MockReviewModel.findOne = jest.fn();
    MockReviewModel.findById = jest.fn();
    MockReviewModel.find = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([mockReview]),
    });
    MockReviewModel.findOneAndUpdate = jest.fn();

    const MockBookingModel = jest.fn();
    MockBookingModel.findOne = jest.fn();
    MockBookingModel.findById = jest.fn();

    const MockProviderModel = jest.fn();
    MockProviderModel.findOne = jest.fn();
    MockProviderModel.findById = jest.fn();
    MockProviderModel.findOneAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getModelToken(Review.name),
          useValue: MockReviewModel,
        },
        {
          provide: getModelToken(Booking.name),
          useValue: MockBookingModel,
        },
        {
          provide: getModelToken(Provider.name),
          useValue: MockProviderModel,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    reviewModel = module.get(getModelToken(Review.name));
    bookingModel = module.get(getModelToken(Booking.name));
    providerModel = module.get(getModelToken(Provider.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createReviewDto: CreateReviewDto = {
      bookingId: '507f1f77bcf86cd799439012',
      rating: 5,
      comment: 'Great service',
    };

    it('should create review successfully', async () => {
      bookingModel.findById.mockResolvedValue(mockBooking);
      reviewModel.findOne.mockResolvedValue(null);
      providerModel.findOneAndUpdate.mockResolvedValue(mockProvider);

      const savedReview = {
        ...mockReview,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(mockReview),
      };
      reviewModel.mockImplementation(() => savedReview);

      // Mock للـ findById مع populate و lean
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          ...mockReview,
          userId: { name: 'Test User', email: 'test@example.com' },
          providerId: { name: 'Test Provider', email: 'provider@example.com' },
        }),
      };
      reviewModel.findById = jest.fn().mockReturnValue(queryMock);

      const result = await service.create(
        mockBooking.userId.toString(),
        createReviewDto,
      );

      expect(bookingModel.findById).toHaveBeenCalledWith(
        createReviewDto.bookingId,
      );
      expect(reviewModel.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('rating', createReviewDto.rating);
    });

    it('should throw NotFoundException when booking not found', async () => {
      // Arrange
      bookingModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.create(mockBooking.userId.toString(), createReviewDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when booking does not belong to user', async () => {
      // Arrange
      const otherUserBooking = {
        ...mockBooking,
        userId: new Types.ObjectId(),
      };
      bookingModel.findById.mockResolvedValue(otherUserBooking);

      // Act & Assert
      await expect(
        service.create(mockBooking.userId.toString(), createReviewDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when booking status is not COMPLETED', async () => {
      // Arrange
      const pendingBooking = {
        ...mockBooking,
        status: BookingStatus.PENDING,
      };
      bookingModel.findById.mockResolvedValue(pendingBooking);

      // Act & Assert
      await expect(
        service.create(mockBooking.userId.toString(), createReviewDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when review already exists', async () => {
      // Arrange
      bookingModel.findById.mockResolvedValue(mockBooking);
      reviewModel.findOne.mockResolvedValue(mockReview);

      // Act & Assert
      await expect(
        service.create(mockBooking.userId.toString(), createReviewDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getProviderReviews', () => {
    it('should return provider reviews successfully', async () => {
      // Arrange
      providerModel.findOne.mockResolvedValue(mockProvider);
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockReview]),
      };
      reviewModel.find = jest.fn().mockReturnValue(queryMock);

      // Act
      const result = await service.getProviderReviews(
        mockProvider.userId.toString(),
      );

      // Assert
      expect(result).toHaveProperty('providerId');
      expect(result).toHaveProperty('totalReviews');
      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('reviews');
    });

    it('should throw NotFoundException when provider not found', async () => {
      // Arrange
      providerModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProviderReviews('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReviewByBookingId', () => {
    it('should return review by booking ID', async () => {
      // Arrange
      const populatedReview = {
        ...mockReview,
        userId: { name: 'Test User', email: 'test@example.com' },
        providerId: { name: 'Test Provider', email: 'provider@example.com' },
      };
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(populatedReview),
      };
      reviewModel.findOne = jest.fn().mockReturnValue(queryMock);

      // Act
      const result = await service.getReviewByBookingId(
        mockBooking._id.toString(),
      );

      // Assert
      expect(result).toEqual(populatedReview);
    });

    it('should throw NotFoundException when review not found', async () => {
      // Arrange
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      reviewModel.findOne = jest.fn().mockReturnValue(queryMock);

      // Act & Assert
      await expect(service.getReviewByBookingId('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

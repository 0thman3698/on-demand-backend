import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { PaymentsService } from './payments.service';
import { Payment, PaymentStatus, PaymentMethod } from './schemas/payment.schema';
import { Booking } from '../bookings/schemas/booking.schema';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { User } from '../auth/schemas/user.schema';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentModel: any;
  let bookingModel: any;
  let userModel: any;

  const mockPayment = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    bookingId: new Types.ObjectId('507f1f77bcf86cd799439012'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    amount: 100.5,
    status: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CARD,
    paymentIntentId: 'stripe_pi_1234567890_abc',
    clientSecret: 'stripe_pi_1234567890_abc_secret_xyz',
    paymentLink: 'http://localhost:3000/payments/confirm/stripe_pi_1234567890_abc',
    provider: 'stripe',
    save: jest.fn(),
    toObject: jest.fn(),
  };

  const mockBooking = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    providerId: new Types.ObjectId('507f1f77bcf86cd799439014'),
    serviceId: new Types.ObjectId('507f1f77bcf86cd799439015'),
    status: BookingStatus.PENDING,
    scheduledAt: new Date(),
    price: 100.5,
    address: '123 Main St',
    notes: 'Test booking',
    save: jest.fn(),
    toObject: jest.fn(),
  };

  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
    name: 'Test User',
    email: 'test@example.com',
    toObject: jest.fn(),
  };

  beforeEach(async () => {
    // Mock Payment Model - needs to be a constructor function
    const MockPaymentModel = jest.fn().mockImplementation((doc) => {
      return {
        ...doc,
        save: jest.fn().mockResolvedValue({ ...doc, _id: new Types.ObjectId() }),
      };
    });
    MockPaymentModel.findOne = jest.fn();
    MockPaymentModel.findById = jest.fn();

    // Mock Booking Model
    const MockBookingModel = jest.fn();
    MockBookingModel.findOne = jest.fn();
    MockBookingModel.findById = jest.fn();

    // Mock User Model
    const MockUserModel = jest.fn();
    MockUserModel.findOne = jest.fn();
    MockUserModel.findById = jest.fn();

    const mockPaymentModel = MockPaymentModel;
    const mockBookingModel = MockBookingModel;
    const mockUserModel = MockUserModel;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
        {
          provide: getModelToken(Booking.name),
          useValue: mockBookingModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentModel = module.get(getModelToken(Payment.name));
    bookingModel = module.get(getModelToken(Booking.name));
    userModel = module.get(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    const userId = '507f1f77bcf86cd799439013';
    const createPaymentIntentDto: CreatePaymentIntentDto = {
      bookingId: '507f1f77bcf86cd799439012',
      paymentMethod: PaymentMethod.CARD,
    };

    it('should create a new payment intent successfully', async () => {
      // Arrange
      const booking = { ...mockBooking };
      bookingModel.findById.mockResolvedValue(booking as any);
      paymentModel.findOne.mockResolvedValue(null);
      
      const savedPayment = {
        ...mockPayment,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      
      // Mock the constructor to return an object with save method
      paymentModel.mockImplementation(() => ({
        ...mockPayment,
        _id: savedPayment._id,
        save: jest.fn().mockResolvedValue(savedPayment),
      }));

      // Act
      const result = await service.createPaymentIntent(userId, createPaymentIntentDto);

      // Assert
      expect(bookingModel.findById).toHaveBeenCalledWith(createPaymentIntentDto.bookingId);
      expect(paymentModel.findOne).toHaveBeenCalledWith({
        bookingId: createPaymentIntentDto.bookingId,
      });
      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('bookingId');
      expect(result).toHaveProperty('amount', booking.price);
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('paymentLink');
      expect(result).toHaveProperty('status', PaymentStatus.PENDING);
      expect(result).toHaveProperty('paymentIntentId');
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      // Arrange
      bookingModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createPaymentIntent(userId, createPaymentIntentDto),
      ).rejects.toThrow(NotFoundException);
      expect(bookingModel.findById).toHaveBeenCalledWith(createPaymentIntentDto.bookingId);
    });

    it('should throw ForbiddenException when booking does not belong to user', async () => {
      // Arrange
      const booking = {
        ...mockBooking,
        userId: new Types.ObjectId('507f1f77bcf86cd799439999'), // Different user
      };
      bookingModel.findById.mockResolvedValue(booking as any);

      // Act & Assert
      await expect(
        service.createPaymentIntent(userId, createPaymentIntentDto),
      ).rejects.toThrow(ForbiddenException);
      expect(bookingModel.findById).toHaveBeenCalledWith(createPaymentIntentDto.bookingId);
    });

    it('should throw BadRequestException when booking status is not PENDING or ACCEPTED', async () => {
      // Arrange
      const booking = {
        ...mockBooking,
        status: BookingStatus.COMPLETED,
      };
      bookingModel.findById.mockResolvedValue(booking as any);

      // Act & Assert
      await expect(
        service.createPaymentIntent(userId, createPaymentIntentDto),
      ).rejects.toThrow(BadRequestException);
      expect(bookingModel.findById).toHaveBeenCalledWith(createPaymentIntentDto.bookingId);
    });

    it('should return existing payment when payment is already succeeded', async () => {
      // Arrange
      const booking = { ...mockBooking };
      const existingPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
      };
      bookingModel.findById.mockResolvedValue(booking as any);
      paymentModel.findOne.mockResolvedValue(existingPayment as any);

      // Act
      const result = await service.createPaymentIntent(userId, createPaymentIntentDto);

      // Assert
      expect(paymentModel.findOne).toHaveBeenCalledWith({
        bookingId: createPaymentIntentDto.bookingId,
      });
      expect(result).toHaveProperty('paymentId', existingPayment._id);
      expect(result).toHaveProperty('clientSecret', existingPayment.clientSecret);
      expect(result).toHaveProperty('paymentLink', existingPayment.paymentLink);
      expect(result).toHaveProperty('status', PaymentStatus.SUCCEEDED);
      expect(result).toHaveProperty('message', 'Payment already completed');
    });

    it('should return existing payment when payment is pending', async () => {
      // Arrange
      const booking = { ...mockBooking };
      const existingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };
      bookingModel.findById.mockResolvedValue(booking as any);
      paymentModel.findOne.mockResolvedValue(existingPayment as any);

      // Act
      const result = await service.createPaymentIntent(userId, createPaymentIntentDto);

      // Assert
      expect(result).toHaveProperty('paymentId', existingPayment._id);
      expect(result).toHaveProperty('status', PaymentStatus.PENDING);
      expect(result).toHaveProperty('message', 'Payment intent already exists');
    });

    it('should return existing payment when payment is processing', async () => {
      // Arrange
      const booking = { ...mockBooking };
      const existingPayment = {
        ...mockPayment,
        status: PaymentStatus.PROCESSING,
      };
      bookingModel.findById.mockResolvedValue(booking as any);
      paymentModel.findOne.mockResolvedValue(existingPayment as any);

      // Act
      const result = await service.createPaymentIntent(userId, createPaymentIntentDto);

      // Assert
      expect(result).toHaveProperty('status', PaymentStatus.PROCESSING);
      expect(result).toHaveProperty('message', 'Payment intent already exists');
    });

    it('should create new payment when existing payment failed', async () => {
      // Arrange
      const booking = { ...mockBooking };
      const existingPayment = {
        ...mockPayment,
        status: PaymentStatus.FAILED,
      };
      bookingModel.findById.mockResolvedValue(booking as any);
      paymentModel.findOne.mockResolvedValue(existingPayment as any);
      
      const savedPayment = {
        ...mockPayment,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      
      // Mock the constructor to return an object with save method
      paymentModel.mockImplementation(() => ({
        ...mockPayment,
        _id: savedPayment._id,
        save: jest.fn().mockResolvedValue(savedPayment),
      }));

      // Act
      const result = await service.createPaymentIntent(userId, createPaymentIntentDto);

      // Assert
      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('status', PaymentStatus.PENDING);
    });

    it('should create payment intent with ACCEPTED booking status', async () => {
      // Arrange
      const booking = {
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
      };
      bookingModel.findById.mockResolvedValue(booking as any);
      paymentModel.findOne.mockResolvedValue(null);
      
      const savedPayment = {
        ...mockPayment,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      
      // Mock the constructor to return an object with save method
      paymentModel.mockImplementation(() => ({
        ...mockPayment,
        _id: savedPayment._id,
        save: jest.fn().mockResolvedValue(savedPayment),
      }));

      // Act
      const result = await service.createPaymentIntent(userId, createPaymentIntentDto);

      // Assert
      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('status', PaymentStatus.PENDING);
    });
  });

  describe('handleWebhook', () => {
    const paymentWebhookDto: PaymentWebhookDto = {
      event: 'payment.succeeded',
      paymentIntentId: 'stripe_pi_1234567890_abc',
      transactionId: 'txn_1234567890',
      data: { some: 'data' },
      signature: 'test_signature',
    };

    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should handle payment.succeeded event successfully', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      const booking = {
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
        save: jest.fn().mockResolvedValue(mockBooking),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);
      bookingModel.findById.mockResolvedValue(booking as any);

      // Act
      const result = await service.handleWebhook(paymentWebhookDto);

      // Assert
      expect(paymentModel.findOne).toHaveBeenCalledWith({
        paymentIntentId: paymentWebhookDto.paymentIntentId,
      });
      expect(payment.save).toHaveBeenCalled();
      expect(booking.save).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Payment processed successfully');
      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('bookingId');
      expect(result).toHaveProperty('status', PaymentStatus.SUCCEEDED);
    });

    it('should handle payment_intent.succeeded event successfully', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      const booking = {
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
        save: jest.fn().mockResolvedValue(mockBooking),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);
      bookingModel.findById.mockResolvedValue(booking as any);

      const webhookDto = {
        ...paymentWebhookDto,
        event: 'payment_intent.succeeded',
      };

      // Act
      const result = await service.handleWebhook(webhookDto);

      // Assert
      expect(result).toHaveProperty('message', 'Payment processed successfully');
      expect(result).toHaveProperty('status', PaymentStatus.SUCCEEDED);
    });

    it('should handle payment.failed event successfully', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);

      const webhookDto = {
        ...paymentWebhookDto,
        event: 'payment.failed',
        data: { failure_reason: 'Insufficient funds' },
      };

      // Act
      const result = await service.handleWebhook(webhookDto);

      // Assert
      expect(payment.save).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Payment failed');
      expect(result).toHaveProperty('status', PaymentStatus.FAILED);
      expect(result).toHaveProperty('failureReason', 'Insufficient funds');
    });

    it('should handle payment_intent.failed event successfully', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);

      const webhookDto = {
        ...paymentWebhookDto,
        event: 'payment_intent.failed',
        data: { message: 'Card declined' },
      };

      // Act
      const result = await service.handleWebhook(webhookDto);

      // Assert
      expect(result).toHaveProperty('message', 'Payment failed');
      expect(result).toHaveProperty('status', PaymentStatus.FAILED);
      expect(result).toHaveProperty('failureReason', 'Card declined');
    });

    it('should handle payment.cancelled event successfully', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);

      const webhookDto = {
        ...paymentWebhookDto,
        event: 'payment.cancelled',
      };

      // Act
      const result = await service.handleWebhook(webhookDto);

      // Assert
      expect(payment.save).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Payment cancelled');
      expect(result).toHaveProperty('status', PaymentStatus.CANCELLED);
    });

    it('should handle payment_intent.cancelled event successfully', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);

      const webhookDto = {
        ...paymentWebhookDto,
        event: 'payment_intent.cancelled',
      };

      // Act
      const result = await service.handleWebhook(webhookDto);

      // Assert
      expect(result).toHaveProperty('message', 'Payment cancelled');
      expect(result).toHaveProperty('status', PaymentStatus.CANCELLED);
    });

    it('should throw NotFoundException when payment is not found', async () => {
      // Arrange
      paymentModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.handleWebhook(paymentWebhookDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(paymentModel.findOne).toHaveBeenCalledWith({
        paymentIntentId: paymentWebhookDto.paymentIntentId,
      });
    });

    it('should return early when payment is already succeeded', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.SUCCEEDED,
      };
      paymentModel.findOne.mockResolvedValue(payment as any);

      // Act
      const result = await service.handleWebhook(paymentWebhookDto);

      // Assert
      expect(result).toHaveProperty('message', 'Payment already processed');
      expect(result).toHaveProperty('status', PaymentStatus.SUCCEEDED);
    });

    it('should return early when payment is already cancelled', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.CANCELLED,
      };
      paymentModel.findOne.mockResolvedValue(payment as any);

      // Act
      const result = await service.handleWebhook(paymentWebhookDto);

      // Assert
      expect(result).toHaveProperty('message', 'Payment already processed');
      expect(result).toHaveProperty('status', PaymentStatus.CANCELLED);
    });

    it('should throw BadRequestException for unsupported webhook event', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };
      paymentModel.findOne.mockResolvedValue(payment as any);

      const webhookDto = {
        ...paymentWebhookDto,
        event: 'unsupported.event',
      };

      // Act & Assert
      await expect(service.handleWebhook(webhookDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when webhook signature is invalid in production', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };
      paymentModel.findOne.mockResolvedValue(payment as any);

      const webhookDto = {
        ...paymentWebhookDto,
        signature: undefined,
      };

      // Act & Assert
      await expect(service.handleWebhook(webhookDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should skip signature verification in development mode', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      const booking = {
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
        save: jest.fn().mockResolvedValue(mockBooking),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);
      bookingModel.findById.mockResolvedValue(booking as any);

      const webhookDto = {
        ...paymentWebhookDto,
        signature: undefined,
      };

      // Act
      const result = await service.handleWebhook(webhookDto);

      // Assert
      expect(result).toHaveProperty('message', 'Payment processed successfully');
    });

    it('should not update booking status if already completed', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      const booking = {
        ...mockBooking,
        status: BookingStatus.COMPLETED,
        save: jest.fn().mockResolvedValue(mockBooking),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);
      bookingModel.findById.mockResolvedValue(booking as any);

      // Act
      await service.handleWebhook(paymentWebhookDto);

      // Assert
      expect(booking.save).not.toHaveBeenCalled();
    });

    it('should handle payment failure with default failure reason when not provided', async () => {
      // Arrange
      const payment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
        save: jest.fn().mockResolvedValue(mockPayment),
      };
      
      paymentModel.findOne.mockResolvedValue(payment as any);

      const webhookDto = {
        ...paymentWebhookDto,
        event: 'payment.failed',
        data: {},
      };

      // Act
      const result = await service.handleWebhook(webhookDto);

      // Assert
      expect(result).toHaveProperty('failureReason', 'Payment failed');
    });
  });

  describe('getPaymentByBookingId', () => {
    const bookingId = '507f1f77bcf86cd799439012';

    it('should return payment by booking ID successfully', async () => {
      // Arrange
      const paymentWithPopulate = {
        ...mockPayment,
        bookingId: mockBooking,
        userId: mockUser,
        toObject: jest.fn().mockReturnValue(mockPayment),
      };
      
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(paymentWithPopulate),
      };
      
      paymentModel.findOne = jest.fn().mockReturnValue(queryMock) as any;

      // Act
      const result = await service.getPaymentByBookingId(bookingId);

      // Assert
      expect(paymentModel.findOne).toHaveBeenCalledWith({ bookingId });
      expect(queryMock.populate).toHaveBeenCalledWith('bookingId');
      expect(queryMock.populate).toHaveBeenCalledWith('userId', 'name email');
      expect(queryMock.lean).toHaveBeenCalled();
      expect(result).toEqual(paymentWithPopulate);
    });

    it('should throw NotFoundException when payment is not found', async () => {
      // Arrange
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      
      paymentModel.findOne = jest.fn().mockReturnValue(queryMock) as any;

      // Act & Assert
      await expect(service.getPaymentByBookingId(bookingId)).rejects.toThrow(
        NotFoundException,
      );
      expect(paymentModel.findOne).toHaveBeenCalledWith({ bookingId });
    });
  });
});


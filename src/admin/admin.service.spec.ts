import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { AdminService } from './admin.service';
import { User, UserRole } from '../auth/schemas/user.schema';
import { Provider } from '../providers/schemas/provider.schema';
import { Booking, BookingStatus } from '../bookings/schemas/booking.schema';
import { Payment, PaymentStatus } from '../payments/schemas/payment.schema';
import { ProviderDecisionDto } from './dto/provider-decision.dto';
import { AccountStatusDto } from './dto/account-status.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

describe('AdminService', () => {
  let service: AdminService;
  let userModel: any;
  let providerModel: any;
  let bookingModel: any;
  let paymentModel: any;

  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
    name: 'Test User',
    email: 'test@example.com',
    isActive: true,
    save: jest.fn(),
  };

  const mockProvider = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439020'),
    verified: false,
    save: jest.fn(),
  };

  beforeEach(async () => {
    const MockUserModel = jest.fn();
    MockUserModel.findOne = jest.fn();
    MockUserModel.findById = jest.fn();
    MockUserModel.countDocuments = jest.fn();

    const MockProviderModel = jest.fn();
    MockProviderModel.findOne = jest.fn();
    MockProviderModel.findById = jest.fn();
    MockProviderModel.find = jest.fn();
    MockProviderModel.countDocuments = jest.fn();

    const MockBookingModel = jest.fn();
    MockBookingModel.findOne = jest.fn();
    MockBookingModel.findById = jest.fn();
    MockBookingModel.countDocuments = jest.fn();
    MockBookingModel.aggregate = jest.fn();

    const MockPaymentModel = jest.fn();
    MockPaymentModel.findOne = jest.fn();
    MockPaymentModel.findById = jest.fn();
    MockPaymentModel.aggregate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
        {
          provide: getModelToken(Provider.name),
          useValue: MockProviderModel,
        },
        {
          provide: getModelToken(Booking.name),
          useValue: MockBookingModel,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: MockPaymentModel,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userModel = module.get(getModelToken(User.name));
    providerModel = module.get(getModelToken(Provider.name));
    bookingModel = module.get(getModelToken(Booking.name));
    paymentModel = module.get(getModelToken(Payment.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingProviders', () => {
    it('should return pending providers', async () => {
      // Arrange
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockProvider]),
      };
      providerModel.find = jest.fn().mockReturnValue(queryMock);

      // Act
      const result = await service.getPendingProviders();

      // Assert
      expect(result).toEqual([mockProvider]);
    });

    it('should throw NotFoundException when no providers found', async () => {
      // Arrange
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      providerModel.find = jest.fn().mockReturnValue(queryMock);

      // Act & Assert
      await expect(service.getPendingProviders()).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approveProvider', () => {
    const decisionDto: ProviderDecisionDto = {
      reason: 'Approved',
    };

    it('should approve provider successfully', async () => {
      // Arrange
      const unverifiedProvider = {
        ...mockProvider,
        verified: false,
        save: jest.fn().mockResolvedValue({
          ...mockProvider,
          verified: true,
        }),
      };
      providerModel.findById.mockResolvedValue(unverifiedProvider);

      // Act
      const result = await service.approveProvider(
        mockProvider._id.toString(),
        decisionDto,
      );

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('verified', true);
      expect(unverifiedProvider.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when provider not found', async () => {
      // Arrange
      providerModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.approveProvider('invalid-id', decisionDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when provider already verified', async () => {
      // Arrange
      const verifiedProvider = {
        ...mockProvider,
        verified: true,
      };
      providerModel.findById.mockResolvedValue(verifiedProvider);

      // Act & Assert
      await expect(
        service.approveProvider(mockProvider._id.toString(), decisionDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectProvider', () => {
    const decisionDto: ProviderDecisionDto = {
      reason: 'Rejected',
    };

    it('should reject provider successfully', async () => {
      // Arrange
      const unverifiedProvider = {
        ...mockProvider,
        verified: false,
        save: jest.fn().mockResolvedValue(mockProvider),
      };
      providerModel.findById.mockResolvedValue(unverifiedProvider);

      // Act
      const result = await service.rejectProvider(
        mockProvider._id.toString(),
        decisionDto,
      );

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('reason', decisionDto.reason);
    });

    it('should throw NotFoundException when provider not found', async () => {
      // Arrange
      providerModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.rejectProvider('invalid-id', decisionDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('suspendUser', () => {
    const statusDto: AccountStatusDto = {
      reason: 'Suspended',
    };

    it('should suspend user successfully', async () => {
      // Arrange
      const activeUser = {
        ...mockUser,
        isActive: true,
        save: jest.fn().mockResolvedValue({
          ...mockUser,
          isActive: false,
        }),
      };
      userModel.findById.mockResolvedValue(activeUser);

      // Act
      const result = await service.suspendUser(
        mockUser._id.toString(),
        statusDto,
      );

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('isActive', false);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.suspendUser('invalid-id', statusDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('banUser', () => {
    const statusDto: AccountStatusDto = {
      reason: 'Banned',
    };

    it('should ban user successfully', async () => {
      // Arrange
      const activeUser = {
        ...mockUser,
        isActive: true,
        save: jest.fn().mockResolvedValue({
          ...mockUser,
          isActive: false,
        }),
      };
      userModel.findById.mockResolvedValue(activeUser);

      // Act
      const result = await service.banUser(mockUser._id.toString(), statusDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('isActive', false);
    });
  });

  describe('suspendProvider', () => {
    const statusDto: AccountStatusDto = {
      reason: 'Suspended',
    };

    it('should suspend provider successfully', async () => {
      // Arrange
      providerModel.findById.mockResolvedValue(mockProvider);
      userModel.findById.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue({
          ...mockUser,
          isActive: false,
        }),
      });

      // Act
      const result = await service.suspendProvider(
        mockProvider._id.toString(),
        statusDto,
      );

      // Assert
      expect(result).toHaveProperty('message');
    });
  });

  describe('banProvider', () => {
    const statusDto: AccountStatusDto = {
      reason: 'Banned',
    };

    it('should ban provider successfully', async () => {
      // Arrange
      providerModel.findById.mockResolvedValue(mockProvider);
      userModel.findById.mockResolvedValue({
        ...mockUser,
        save: jest.fn().mockResolvedValue({
          ...mockUser,
          isActive: false,
        }),
      });

      // Act
      const result = await service.banProvider(
        mockProvider._id.toString(),
        statusDto,
      );

      // Assert
      expect(result).toHaveProperty('message');
    });
  });

  describe('getAnalyticsOverview', () => {
    it('should return analytics overview', async () => {
      // Arrange
      userModel.countDocuments.mockResolvedValue(10);
      providerModel.countDocuments.mockResolvedValue(5);
      bookingModel.countDocuments
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(7);

      // Act
      const result = await service.getAnalyticsOverview();

      // Assert
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('providers');
      expect(result).toHaveProperty('bookings');
    });
  });

  describe('getBookingsAnalytics', () => {
    it('should return bookings analytics', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {};
      bookingModel.aggregate
        .mockResolvedValueOnce([
          { _id: BookingStatus.PENDING, count: 5 },
          { _id: BookingStatus.COMPLETED, count: 10 },
        ])
        .mockResolvedValueOnce([
          { _id: '2024-01-01', count: 2 },
          { _id: '2024-01-02', count: 3 },
        ]);

      // Act
      const result = await service.getBookingsAnalytics(queryDto);

      // Assert
      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('dailyVolume');
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics', async () => {
      // Arrange
      const queryDto: AnalyticsQueryDto = {};
      paymentModel.aggregate
        .mockResolvedValueOnce([
          {
            _id: null,
            totalRevenue: 1000,
            totalTransactions: 10,
            averageTransaction: 100,
          },
        ])
        .mockResolvedValueOnce([
          { _id: '2024-01-01', revenue: 500, transactions: 5 },
          { _id: '2024-01-02', revenue: 500, transactions: 5 },
        ]);

      // Act
      const result = await service.getRevenueAnalytics(queryDto);

      // Assert
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('totalTransactions');
      expect(result).toHaveProperty('dailyRevenue');
    });
  });
});


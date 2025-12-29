import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { UsersService } from './users.service';
import { User, UserRole } from '../auth/schemas/user.schema';
import { Booking } from '../bookings/schemas/booking.schema';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;
  let bookingModel: any;

  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
    name: 'Test User',
    email: 'test@example.com',
    phone: '+1234567890',
    role: UserRole.USER,
    isEmailVerified: true,
    isPhoneVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBooking = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    status: 'PENDING',
    scheduledAt: new Date(),
    price: 100.5,
    address: '123 Main St',
    notes: 'Test booking',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const MockUserModel = jest.fn();
    MockUserModel.findOne = jest.fn();
    MockUserModel.findById = jest.fn();
    MockUserModel.findByIdAndUpdate = jest.fn();

    const MockBookingModel = jest.fn();
    MockBookingModel.find = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
        {
          provide: getModelToken(Booking.name),
          useValue: MockBookingModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get(getModelToken(User.name));
    bookingModel = module.get(getModelToken(Booking.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      // Arrange
      const queryMock = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      userModel.findById = jest.fn().mockReturnValue(queryMock);

      // Act
      const result = await service.getProfile(mockUser._id.toString());

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', mockUser.name);
      expect(result).toHaveProperty('email', mockUser.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const queryMock = {
        select: jest.fn().mockResolvedValue(null),
      };
      userModel.findById = jest.fn().mockReturnValue(queryMock);

      // Act & Assert
      await expect(service.getProfile('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
    };

    it('should update user profile successfully', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      const updatedUser = {
        ...mockUser,
        ...updateUserDto,
      };
      const queryMock = {
        select: jest.fn().mockResolvedValue(updatedUser),
      };
      userModel.findByIdAndUpdate = jest.fn().mockReturnValue(queryMock);

      // Act
      const result = await service.updateProfile(
        mockUser._id.toString(),
        updateUserDto,
      );

      // Assert
      expect(result).toHaveProperty('name', updateUserDto.name);
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      const updateWithEmail: UpdateUserDto = {
        email: 'existing@example.com',
      };
      userModel.findOne.mockResolvedValue({
        ...mockUser,
        _id: new Types.ObjectId(),
      });

      // Act & Assert
      await expect(
        service.updateProfile(mockUser._id.toString(), updateWithEmail),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when phone already exists', async () => {
      // Arrange
      const updateWithPhone: UpdateUserDto = {
        phone: '+9876543210',
      };
      userModel.findOne.mockResolvedValue({
        ...mockUser,
        _id: new Types.ObjectId(),
      });

      // Act & Assert
      await expect(
        service.updateProfile(mockUser._id.toString(), updateWithPhone),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      const queryMock = {
        select: jest.fn().mockResolvedValue(null),
      };
      userModel.findByIdAndUpdate = jest.fn().mockReturnValue(queryMock);

      // Act & Assert
      await expect(
        service.updateProfile('invalid-id', updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserBookings', () => {
    it('should return user bookings successfully', async () => {
      // Arrange
      const populatedBookings = [
        {
          ...mockBooking,
          providerId: { name: 'Provider', email: 'provider@example.com' },
          serviceId: { name: 'Service', category: 'Category' },
        },
      ];
      const queryMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(populatedBookings),
      };
      bookingModel.find = jest.fn().mockReturnValue(queryMock);

      // Act
      const result = await service.getUserBookings(mockUser._id.toString());

      // Assert
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});


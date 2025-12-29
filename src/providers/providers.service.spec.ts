import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProvidersService } from './providers.service';
import { Provider, AvailabilityStatus } from './schemas/provider.schema';
import { User, UserRole } from '../auth/schemas/user.schema';
import { Service } from '../services/schemas/service.schema';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let providerModel: any;
  let userModel: any;
  let serviceModel: any;

  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.PROVIDER,
    save: jest.fn(),
  };

  const mockService = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439015'),
    name: 'Test Service',
    isActive: true,
    deletedAt: null,
  };

  const mockProvider = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
    userId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    verified: false,
    services: [new Types.ObjectId('507f1f77bcf86cd799439015')],
    rating: 0,
    availabilityStatus: AvailabilityStatus.AVAILABLE,
    save: jest.fn(),
    toObject: jest.fn(),
  };

  beforeEach(async () => {
    const MockProviderModel = jest.fn().mockImplementation((doc) => {
      return {
        ...doc,
        save: jest
          .fn()
          .mockResolvedValue({ ...doc, _id: new Types.ObjectId() }),
      };
    });
    MockProviderModel.findOne = jest.fn();
    MockProviderModel.findById = jest.fn();
    MockProviderModel.findByIdAndUpdate = jest.fn();
    MockProviderModel.find = jest.fn();

    const MockUserModel = jest.fn();
    MockUserModel.findOne = jest.fn();
    MockUserModel.findById = jest.fn();

    const MockServiceModel = jest.fn();
    MockServiceModel.find = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: getModelToken(Provider.name), useValue: MockProviderModel },
        { provide: getModelToken(User.name), useValue: MockUserModel },
        { provide: getModelToken(Service.name), useValue: MockServiceModel },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    providerModel = module.get(getModelToken(Provider.name));
    userModel = module.get(getModelToken(User.name));
    serviceModel = module.get(getModelToken(Service.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --------- APPLY TESTS ---------
  describe('apply', () => {
    const createProviderDto: CreateProviderDto = {
      services: ['507f1f77bcf86cd799439015'],
      expertise: 'Test expertise',
      bio: 'Test bio',
      pricing: { '507f1f77bcf86cd799439015': 100 },
    };

    it('should create provider application successfully', async () => {
      userModel.findById.mockResolvedValue(mockUser);
      providerModel.findOne.mockResolvedValue(null);
      serviceModel.find.mockResolvedValue([mockService]);

      providerModel.mockImplementation(() => ({
        ...mockProvider,
        save: jest.fn().mockResolvedValue(mockProvider),
      }));

      const result = await service.apply(
        mockUser._id.toString(),
        createProviderDto,
      );

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('providerId');
      expect(result).toHaveProperty('verified', false);
    });

    it('should throw NotFoundException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);
      await expect(
        service.apply(mockUser._id.toString(), createProviderDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user role is not PROVIDER', async () => {
      userModel.findById.mockResolvedValue({
        ...mockUser,
        role: UserRole.USER,
      });
      await expect(
        service.apply(mockUser._id.toString(), createProviderDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when provider profile already exists', async () => {
      userModel.findById.mockResolvedValue({
        _id: mockUser._id,
        role: UserRole.PROVIDER,
      });

      providerModel.findOne.mockResolvedValue({
        _id: new Types.ObjectId(),
      });

      await expect(
        service.apply(mockUser._id.toString(), createProviderDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when no services provided', async () => {
      providerModel.findOne.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockUser);
      await expect(
        service.apply(mockUser._id.toString(), {
          ...createProviderDto,
          services: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when services are invalid', async () => {
      providerModel.findOne.mockResolvedValue(null);
      userModel.findById.mockResolvedValue(mockUser);
      serviceModel.find.mockResolvedValue([]);
      await expect(
        service.apply(mockUser._id.toString(), createProviderDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --------- GET PROFILE ---------
  describe('getProfile', () => {
    it('should return provider profile successfully', async () => {
      const populatedProvider = {
        ...mockProvider,
        userId: mockUser,
        services: [mockService],
      };
      providerModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(populatedProvider),
      });

      const result = await service.getProfile(mockUser._id.toString());
      expect(result).toEqual(populatedProvider);
    });

    it('should throw NotFoundException when provider not found', async () => {
      providerModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getProfile(mockUser._id.toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --------- UPDATE PROFILE ---------
  describe('updateProfile', () => {
    const updateProviderDto: UpdateProviderDto = {
      expertise: 'Updated expertise',
      bio: 'Updated bio',
    };

    it('should update provider profile successfully', async () => {
      providerModel.findOne.mockResolvedValue(mockProvider);
      providerModel.findByIdAndUpdate.mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue({ ...mockProvider, ...updateProviderDto }),
      });

      const result = await service.updateProfile(
        mockUser._id.toString(),
        updateProviderDto,
      );
      expect(result).toEqual({ ...mockProvider, ...updateProviderDto });
    });

    it('should throw NotFoundException when provider not found', async () => {
      providerModel.findOne.mockResolvedValue(null);
      await expect(
        service.updateProfile(mockUser._id.toString(), updateProviderDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate services when updating', async () => {
      providerModel.findOne.mockResolvedValue(mockProvider);
      serviceModel.find.mockResolvedValue([]);
      await expect(
        service.updateProfile(mockUser._id.toString(), {
          ...updateProviderDto,
          services: ['507f1f77bcf86cd799439015'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --------- UPDATE AVAILABILITY ---------
  describe('updateAvailability', () => {
    const updateAvailabilityDto: UpdateAvailabilityDto = {
      availabilityStatus: AvailabilityStatus.BUSY,
    };

    it('should update availability successfully', async () => {
      providerModel.findOne.mockResolvedValue(mockProvider);
      providerModel.findByIdAndUpdate.mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue({ ...mockProvider, ...updateAvailabilityDto }),
      });

      const result = await service.updateAvailability(
        mockUser._id.toString(),
        updateAvailabilityDto,
      );
      expect(result).toEqual({ ...mockProvider, ...updateAvailabilityDto });
    });

    it('should throw NotFoundException when provider not found', async () => {
      providerModel.findOne.mockResolvedValue(null);
      await expect(
        service.updateAvailability(
          mockUser._id.toString(),
          updateAvailabilityDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate weekly schedule when updating', async () => {
      providerModel.findOne.mockResolvedValue(mockProvider);
      const invalidScheduleDto = {
        ...updateAvailabilityDto,
        weeklySchedule: {
          monday: { start: '10:00', end: '09:00', available: true },
        },
      };
      await expect(
        service.updateAvailability(mockUser._id.toString(), invalidScheduleDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --------- IS PROVIDER VERIFIED ---------
  describe('isProviderVerified', () => {
    it('should return true when provider is verified', async () => {
      providerModel.findOne.mockResolvedValue({
        ...mockProvider,
        verified: true,
      });
      const result = await service.isProviderVerified(mockUser._id.toString());
      expect(result).toBe(true);
    });

    it('should return false when provider is not verified', async () => {
      providerModel.findOne.mockResolvedValue(mockProvider);
      const result = await service.isProviderVerified(mockUser._id.toString());
      expect(result).toBe(false);
    });

    it('should return false when provider not found', async () => {
      providerModel.findOne.mockResolvedValue(null);
      const result = await service.isProviderVerified(mockUser._id.toString());
      expect(result).toBe(false);
    });
  });
});

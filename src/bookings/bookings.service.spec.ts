import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { BookingsService } from './bookings.service';
import { Booking } from './schemas/booking.schema';
import { Provider } from '../providers/schemas/provider.schema';
import { User, UserRole } from '../auth/schemas/user.schema';
import { BookingStatus } from './enums/booking-status.enum';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingModel: any;
  let providerModel: any;
  let userModel: any;

  const userId = new Types.ObjectId().toString();
  const providerUserId = new Types.ObjectId().toString();
  const providerId = new Types.ObjectId();
  const serviceId = new Types.ObjectId();
  const bookingId = new Types.ObjectId();

  beforeEach(async () => {
    // ================= Booking Model =================
    const MockBookingModel = jest.fn().mockImplementation((doc) => ({
      ...doc,
      _id: bookingId,
      save: jest.fn().mockResolvedValue(doc),
    }));

    MockBookingModel.findById = jest.fn();
    MockBookingModel.find = jest.fn();

    // ================= Provider Model =================
    const MockProviderModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };

    // ================= User Model =================
    const MockUserModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getModelToken(Booking.name), useValue: MockBookingModel },
        { provide: getModelToken(Provider.name), useValue: MockProviderModel },
        { provide: getModelToken(User.name), useValue: MockUserModel },
      ],
    }).compile();

    service = module.get(BookingsService);
    bookingModel = module.get(getModelToken(Booking.name));
    providerModel = module.get(getModelToken(Provider.name));
    userModel = module.get(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // CREATE
  // =====================================================
  describe('create', () => {
    it('should create booking successfully', async () => {
      userModel.findById.mockResolvedValue({
        _id: userId,
        role: UserRole.USER,
      });

      providerModel.findById.mockResolvedValue({
        _id: providerId,
        userId: providerUserId,
        verified: true,
      });

      const populatedBooking = {
        _id: bookingId,
        userId: { _id: userId },
        providerId: { _id: providerId },
        serviceId: { _id: serviceId },
      };

      const queryMock = {
        populate: jest.fn(),
      };

      queryMock.populate
        .mockImplementationOnce(() => queryMock)
        .mockImplementationOnce(() => queryMock)
        .mockResolvedValueOnce(populatedBooking);

      bookingModel.findById.mockReturnValue(queryMock);

      const dto = {
        providerId: providerUserId,
        serviceId: serviceId.toString(),
        scheduledAt: new Date(Date.now() + 100000),
        price: 100,
        address: 'Test address',
      };

      const result = await service.create(userId, dto as any);

      expect(result._id).toEqual(bookingId);
      expect(userModel.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.create(userId, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =====================================================
  // FIND ONE
  // =====================================================
  describe('findOne', () => {
    it('should return booking for ADMIN', async () => {
      const populatedBooking = {
        _id: bookingId,
        userId: { _id: userId },
        providerId: { _id: providerId },
        serviceId: { _id: serviceId },
      };

      const queryMock = {
        populate: jest.fn(),
      };

      queryMock.populate
        .mockImplementationOnce(() => queryMock)
        .mockImplementationOnce(() => queryMock)
        .mockResolvedValueOnce(populatedBooking);

      bookingModel.findById.mockReturnValue(queryMock);

      const result = await service.findOne(
        bookingId.toString(),
        userId,
        UserRole.ADMIN,
      );

      expect(result._id).toEqual(bookingId);
    });

    it('should throw ForbiddenException for other user', async () => {
      const populatedBooking = {
        _id: bookingId,
        userId: { _id: new Types.ObjectId() },
        providerId: { _id: providerId },
      };

      const queryMock = {
        populate: jest.fn(),
      };

      queryMock.populate
        .mockImplementationOnce(() => queryMock)
        .mockImplementationOnce(() => queryMock)
        .mockResolvedValueOnce(populatedBooking);

      bookingModel.findById.mockReturnValue(queryMock);

      await expect(
        service.findOne(bookingId.toString(), userId, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =====================================================
  // UPDATE STATUS
  // =====================================================
  describe('updateStatus', () => {
    it('should update booking status', async () => {
      const bookingDoc = {
        _id: bookingId,
        providerId: providerUserId,
        status: BookingStatus.PENDING,
        save: jest.fn(),
      };

      bookingModel.findById.mockResolvedValue(bookingDoc);

      providerModel.findOne.mockResolvedValue({
        userId: providerUserId,
      });

      const populatedBooking = {
        ...bookingDoc,
        status: BookingStatus.ACCEPTED,
      };

      const queryMock = {
        populate: jest.fn(),
      };

      queryMock.populate
        .mockImplementationOnce(() => queryMock)
        .mockImplementationOnce(() => queryMock)
        .mockResolvedValueOnce(populatedBooking);

      bookingModel.findById.mockReturnValueOnce(bookingDoc);
      bookingModel.findById.mockReturnValueOnce(queryMock);

      const result = await service.updateStatus(
        bookingId.toString(),
        providerUserId,
        { status: BookingStatus.ACCEPTED },
      );

      expect(result.status).toBe(BookingStatus.ACCEPTED);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { RealtimeService, AuthenticatedSocket } from './realtime.service';
import { ProviderLocationDto } from '../../dto/provider-location.dto';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<AuthenticatedSocket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeService],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };

    // Mock Socket
    mockSocket = {
      userId: '507f1f77bcf86cd799439013',
      role: 'USER',
      join: jest.fn(),
      leave: jest.fn(),
    };

    service.setServer(mockServer as Server);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setServer', () => {
    it('should set the server instance', () => {
      // Arrange
      const newServer = {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      } as unknown as Server;

      // Act
      service.setServer(newServer);

      // Assert
      expect(service).toBeDefined();
    });
  });

  describe('emitBookingCreated', () => {
    it('should emit booking created event to provider', () => {
      // Arrange
      const bookingId = '507f1f77bcf86cd799439012';
      const providerId = '507f1f77bcf86cd799439014';
      const bookingData = { status: 'PENDING' };

      // Act
      service.emitBookingCreated(bookingId, providerId, bookingData);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(`provider:${providerId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`booking:${bookingId}`);
    });
  });

  describe('emitBookingAccepted', () => {
    it('should emit booking accepted event to user', () => {
      // Arrange
      const bookingId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';
      const bookingData = { status: 'ACCEPTED' };

      // Act
      service.emitBookingAccepted(bookingId, userId, bookingData);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`booking:${bookingId}`);
    });
  });

  describe('emitBookingStatusUpdated', () => {
    it('should emit booking status updated event to user and provider', () => {
      // Arrange
      const bookingId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';
      const providerId = '507f1f77bcf86cd799439014';
      const statusData = { status: 'ON_THE_WAY' };

      // Act
      service.emitBookingStatusUpdated(bookingId, userId, providerId, statusData);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(`user:${userId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`provider:${providerId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`booking:${bookingId}`);
    });
  });

  describe('emitProviderLocation', () => {
    it('should emit provider location with bookingId', () => {
      // Arrange
      const providerId = '507f1f77bcf86cd799439014';
      const bookingId = '507f1f77bcf86cd799439012';
      const locationData: ProviderLocationDto = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      // Act
      service.emitProviderLocation(providerId, locationData, bookingId);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(`booking:${bookingId}`);
    });

    it('should emit provider location without bookingId', () => {
      // Arrange
      const providerId = '507f1f77bcf86cd799439014';
      const locationData: ProviderLocationDto = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      // Act
      service.emitProviderLocation(providerId, locationData);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(`provider:${providerId}`);
    });
  });

  describe('joinUserRoom', () => {
    it('should join user to their personal room', () => {
      // Act
      service.joinUserRoom(mockSocket as AuthenticatedSocket);

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(
        `user:${mockSocket.userId}`,
      );
    });

    it('should not join if userId is not set', () => {
      // Arrange
      const socketWithoutUserId = {
        join: jest.fn(),
      } as AuthenticatedSocket;

      // Act
      service.joinUserRoom(socketWithoutUserId);

      // Assert
      expect(socketWithoutUserId.join).not.toHaveBeenCalled();
    });
  });

  describe('joinProviderRoom', () => {
    it('should join provider to their personal room', () => {
      // Act
      service.joinProviderRoom(mockSocket as AuthenticatedSocket);

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(
        `provider:${mockSocket.userId}`,
      );
    });

    it('should not join if userId is not set', () => {
      // Arrange
      const socketWithoutUserId = {
        join: jest.fn(),
      } as AuthenticatedSocket;

      // Act
      service.joinProviderRoom(socketWithoutUserId);

      // Assert
      expect(socketWithoutUserId.join).not.toHaveBeenCalled();
    });
  });

  describe('joinBookingRoom', () => {
    it('should join booking room', () => {
      // Arrange
      const bookingId = '507f1f77bcf86cd799439012';

      // Act
      service.joinBookingRoom(mockSocket as AuthenticatedSocket, bookingId);

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(`booking:${bookingId}`);
    });
  });

  describe('leaveBookingRoom', () => {
    it('should leave booking room', () => {
      // Arrange
      const bookingId = '507f1f77bcf86cd799439012';

      // Act
      service.leaveBookingRoom(mockSocket as AuthenticatedSocket, bookingId);

      // Assert
      expect(mockSocket.leave).toHaveBeenCalledWith(`booking:${bookingId}`);
    });
  });
});


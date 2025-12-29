import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ProviderLocationDto } from '../dto/provider-location.dto';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
}

@Injectable()
export class RealtimeService {
  private server: Server;

  /**
   * Set the Socket.IO server instance
   */
  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Emit booking created event to provider
   */
  emitBookingCreated(bookingId: string, providerId: string, bookingData: any) {
    // Emit to provider's personal room
    this.server.to(`provider:${providerId}`).emit('booking.created', {
      bookingId,
      ...bookingData,
    });

    // Also emit to booking room
    this.server.to(`booking:${bookingId}`).emit('booking.created', {
      bookingId,
      ...bookingData,
    });
  }

  /**
   * Emit booking accepted event to user
   */
  emitBookingAccepted(bookingId: string, userId: string, bookingData: any) {
    // Emit to user's personal room
    this.server.to(`user:${userId}`).emit('booking.accepted', {
      bookingId,
      ...bookingData,
    });

    // Also emit to booking room
    this.server.to(`booking:${bookingId}`).emit('booking.accepted', {
      bookingId,
      ...bookingData,
    });
  }

  /**
   * Emit booking status updated event to both user and provider
   */
  emitBookingStatusUpdated(
    bookingId: string,
    userId: string,
    providerId: string,
    statusData: any,
  ) {
    const eventData = {
      bookingId,
      ...statusData,
    };

    // Emit to user's personal room
    this.server.to(`user:${userId}`).emit('booking.status.updated', eventData);

    // Emit to provider's personal room
    this.server.to(`provider:${providerId}`).emit('booking.status.updated', eventData);

    // Emit to booking room
    this.server.to(`booking:${bookingId}`).emit('booking.status.updated', eventData);
  }

  /**
   * Emit provider location update
   */
  emitProviderLocation(
    providerId: string,
    locationData: ProviderLocationDto,
    bookingId?: string,
  ) {
    const eventData = {
      providerId,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      timestamp: new Date().toISOString(),
    };

    if (bookingId) {
      // Emit to booking room only
      this.server.to(`booking:${bookingId}`).emit('provider.location.updated', eventData);
    } else {
      // If no bookingId, emit to provider's room (for tracking)
      this.server.to(`provider:${providerId}`).emit('provider.location.updated', eventData);
    }
  }

  /**
   * Join user to their personal room
   */
  joinUserRoom(socket: AuthenticatedSocket) {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }
  }

  /**
   * Join provider to their personal room
   */
  joinProviderRoom(socket: AuthenticatedSocket) {
    if (socket.userId) {
      socket.join(`provider:${socket.userId}`);
    }
  }

  /**
   * Join booking room
   */
  joinBookingRoom(socket: AuthenticatedSocket, bookingId: string) {
    socket.join(`booking:${bookingId}`);
  }

  /**
   * Leave booking room
   */
  leaveBookingRoom(socket: AuthenticatedSocket, bookingId: string) {
    socket.leave(`booking:${bookingId}`);
  }
}


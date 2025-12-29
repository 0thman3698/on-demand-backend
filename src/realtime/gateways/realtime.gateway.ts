import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { RealtimeService } from '../services/realtime.service';
import type { AuthenticatedSocket } from '../services/realtime.service';
import { ProviderLocationDto } from '../dto/provider-location.dto';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { UserRole } from '../../auth/schemas/user.schema';
import { Logger } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on your frontend URL
    credentials: true,
  },
  namespace: '/',
})
@UseGuards(WsJwtGuard)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly realtimeService: RealtimeService) {}

  /**
   * Handle socket connection
   */
  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id} (User: ${client.userId})`);

    // Join user to their personal room based on role
    if (client.role === UserRole.USER) {
      this.realtimeService.joinUserRoom(client);
      this.logger.log(`User ${client.userId} joined user room`);
    } else if (client.role === UserRole.PROVIDER) {
      this.realtimeService.joinProviderRoom(client);
      this.logger.log(`Provider ${client.userId} joined provider room`);
    }

    // Set server instance in service
    this.realtimeService.setServer(this.server);
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `Client disconnected: ${client.id} (User: ${client.userId})`,
    );
  }

  /**
   * Join booking room
   * Both user and provider can join booking rooms
   */
  @SubscribeMessage('join.booking')
  handleJoinBooking(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { bookingId: string },
  ) {
    if (!data.bookingId) {
      client.emit('error', { message: 'Booking ID is required' });
      return;
    }

    this.realtimeService.joinBookingRoom(client, data.bookingId);
    this.logger.log(
      `Client ${client.userId} joined booking room: ${data.bookingId}`,
    );

    client.emit('joined.booking', { bookingId: data.bookingId });
  }

  /**
   * Leave booking room
   */
  @SubscribeMessage('leave.booking')
  handleLeaveBooking(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { bookingId: string },
  ) {
    if (!data.bookingId) {
      client.emit('error', { message: 'Booking ID is required' });
      return;
    }

    this.realtimeService.leaveBookingRoom(client, data.bookingId);
    this.logger.log(
      `Client ${client.userId} left booking room: ${data.bookingId}`,
    );

    client.emit('left.booking', { bookingId: data.bookingId });
  }

  /**
   * Provider location update
   * Only PROVIDER role can emit location updates
   */
  @SubscribeMessage('provider.location.update')
  handleProviderLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() locationData: ProviderLocationDto,
  ) {
    // Verify user is a provider
    if (client.role !== UserRole.PROVIDER) {
      client.emit('error', { message: 'Only providers can update location' });
      return;
    }

    if (!client.userId) {
      client.emit('error', { message: 'User ID not found' });
      return;
    }

    // Validate location data
    if (
      typeof locationData.latitude !== 'number' ||
      typeof locationData.longitude !== 'number'
    ) {
      client.emit('error', { message: 'Invalid location data' });
      return;
    }

    // Emit location update
    this.realtimeService.emitProviderLocation(
      client.userId,
      locationData,
      locationData.bookingId,
    );

    this.logger.log(
      `Provider ${client.userId} updated location: ${locationData.latitude}, ${locationData.longitude}`,
    );

    client.emit('location.updated', { success: true });
  }
}

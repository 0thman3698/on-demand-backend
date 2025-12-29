import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException('Unauthorized: No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'jwt-secret',
      });

      // Attach user info to socket
      (client as any).userId = payload.sub;
      (client as any).role = payload.role;
      (client as any).email = payload.email;

      return true;
    } catch (error) {
      throw new WsException('Unauthorized: Invalid token');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // Try to get token from handshake auth
    const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization;
    
    if (authHeader) {
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return authHeader as string;
    }

    // Try to get from query params
    const token = client.handshake.query?.token as string;
    return token;
  }
}


import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { RealtimeService } from './services/realtime.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'jwt-secret',
    }),
  ],
  providers: [RealtimeGateway, RealtimeService, WsJwtGuard],
  exports: [RealtimeService],
})
export class RealtimeModule {}


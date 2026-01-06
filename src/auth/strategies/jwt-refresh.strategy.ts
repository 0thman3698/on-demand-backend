import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

export interface JwtRefreshPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    const jwtRefreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: (req: Request) =>
        (req.body?.refreshToken as string) ||
        (ExtractJwt.fromAuthHeaderAsBearerToken()(req) as string),
      ignoreExpiration: false,
      secretOrKey: jwtRefreshSecret,
      passReqToCallback: true,
    };

    super(options);
  }

  async validate(req: Request, payload: JwtRefreshPayload) {
    const refreshToken =
      (req.body?.refreshToken as string) ||
      (ExtractJwt.fromAuthHeaderAsBearerToken()(req) as string);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const user = await this.authService.validateUser(payload.sub);
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
  }
}

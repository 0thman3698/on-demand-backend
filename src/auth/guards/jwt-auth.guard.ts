import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../schemas/user.schema';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any): any {
    if (err || !user) {
      throw err || new UnauthorizedException('Token expired or invalid');
    }
    return user as unknown as User;
  }
}

// Module
export { AuthModule } from './auth.module';

// Service
export { AuthService } from './auth.service';

// Controller
export { AuthController } from './auth.controller';

// Schemas
export { User, UserSchema, UserRole } from './schemas/user.schema';

// DTOs
export { RegisterDto } from './dto/register.dto';
export { LoginDto } from './dto/login.dto';
export { VerifyOtpDto } from './dto/verify-otp.dto';
export { RefreshTokenDto } from './dto/refresh-token.dto';
export { ForgotPasswordDto } from './dto/forgot-password.dto';
export { ResetPasswordDto } from './dto/reset-password.dto';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { JwtRefreshGuard } from './guards/jwt-refresh.guard';
export { RolesGuard } from './guards/roles.guard';

// Decorators
export { Roles } from './decorators/roles.decorator';
export { CurrentUser } from './decorators/current-user.decorator';

// Strategies
export { JwtStrategy } from './strategies/jwt.strategy';
export { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

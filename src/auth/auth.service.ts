import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthProvider, User, UserRole } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

type VerifyOtpUpdate = {
  otpCode: null;
  otpExpiresAt: null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, phone, password, name, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])],
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = new this.userModel({
      name,
      email,
      phone,
      password: hashedPassword,
      role: role || UserRole.USER,
      otpCode,
      otpExpiresAt,
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    await user.save();

    // TODO: Send OTP via email/SMS service
    // For now, we'll return it in response (remove in production)
    return {
      message: 'Registration successful. Please verify your account with OTP.',
      userId: user._id,
      // Remove this in production - OTP should be sent via email/SMS
      otpCode:
        this.configService.get<string>('NODE_ENV') === 'development'
          ? otpCode
          : undefined,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, phone, password } = loginDto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    // Find user
    const user = await this.userModel.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is verified (email or phone)
    if (!user.isEmailVerified && !user.isPhoneVerified) {
      throw new UnauthorizedException(
        'Please verify your account before logging in',
      );
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update refresh token in database
    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken: tokens.refreshToken,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, phone, otpCode } = verifyOtpDto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const user = await this.userModel.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if OTP is valid
    if (user.otpCode !== otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Check if OTP is expired
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP code has expired');
    }

    // Verify account
    const updateData: VerifyOtpUpdate = {
      otpCode: null,
      otpExpiresAt: null,
    };

    if (email) {
      updateData.isEmailVerified = true;
    }
    if (phone) {
      updateData.isPhoneVerified = true;
    }

    await this.userModel.findByIdAndUpdate(user._id, updateData);

    return {
      message: 'Account verified successfully',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub);

      if (!user || !user.isActive || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update refresh token
      await this.userModel.findByIdAndUpdate(user._id, {
        refreshToken: tokens.refreshToken,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
      console.error(error);
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email, phone } = forgotPasswordDto;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const user = await this.userModel.findOne({
      $or: [{ email }, ...(phone ? [{ phone }] : [])],
    });

    if (!user) {
      // Don't reveal if user exists for security
      return {
        message: 'If an account exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userModel.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    // TODO: Send reset link via email/SMS
    // For now, we'll return it in response (remove in production)
    return {
      message: 'If an account exists, a password reset link has been sent.',
      // Remove this in production
      resetToken:
        this.configService.get<string>('NODE_ENV') === 'development'
          ? resetToken
          : undefined,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    return {
      message: 'Password reset successfully',
    };
  }

  async googleLogin(user: { email: string; name: string; googleId: string }) {
    let dbUser = await this.userModel.findOne({ email: user.email });
    if (!dbUser) {
      dbUser = new this.userModel({
        email: user.email,
        name: user.name,
        provider: AuthProvider.GOOGLE,
        googleId: user.googleId,
        isEmailVerified: true,
      });
      await dbUser.save();
    }
    const tokens = await this.generateTokens(dbUser);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
      },
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    // Generate 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

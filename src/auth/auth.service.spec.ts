import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

jest.mock('bcrypt');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
    name: 'Test User',
    email: 'test@example.com',
    phone: '+1234567890',
    password: 'hashedPassword',
    role: UserRole.USER,
    isEmailVerified: false,
    isPhoneVerified: false,
    isActive: true,
    otpCode: '123456',
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    refreshToken: 'refresh-token',
    save: jest.fn(),
    toObject: jest.fn(),
  };

  beforeEach(async () => {
    const MockUserModel = jest.fn().mockImplementation((doc) => {
      return {
        ...doc,
        save: jest.fn().mockResolvedValue({ ...doc, _id: new Types.ObjectId() }),
      };
    });
    MockUserModel.findOne = jest.fn();
    MockUserModel.findById = jest.fn();
    MockUserModel.findByIdAndUpdate = jest.fn();

    const mockJwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      password: 'password123',
      role: UserRole.USER,
    };

    it('should register a new user successfully', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      process.env.NODE_ENV = 'development';

      const savedUser = {
        ...mockUser,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(mockUser),
      };
      userModel.mockImplementation(() => savedUser);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: registerDto.email }, { phone: registerDto.phone }],
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('otpCode');
    });

    it('should throw ConflictException when user already exists by email', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userModel.findOne).toHaveBeenCalled();
    });

    it('should throw ConflictException when user already exists by phone', async () => {
      // Arrange
      const existingUser = { ...mockUser, email: 'other@example.com' };
      userModel.findOne.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should not return OTP code in production', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      process.env.NODE_ENV = 'production';

      const savedUser = {
        ...mockUser,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(mockUser),
      };
      userModel.mockImplementation(() => savedUser);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result.otpCode).toBeUndefined();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with email', async () => {
      // Arrange
      const user = {
        ...mockUser,
        isEmailVerified: true,
      };
      userModel.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: loginDto.email }],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should login user successfully with phone', async () => {
      // Arrange
      const phoneLoginDto: LoginDto = {
        phone: '+1234567890',
        password: 'password123',
      };
      const user = {
        ...mockUser,
        isPhoneVerified: true,
      };
      userModel.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      // Act
      const result = await service.login(phoneLoginDto);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw BadRequestException when neither email nor phone provided', async () => {
      // Arrange
      const invalidDto: LoginDto = {
        password: 'password123',
      } as LoginDto;

      // Act & Assert
      await expect(service.login(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const inactiveUser = {
        ...mockUser,
        isActive: false,
      };
      userModel.findOne.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when account is not verified', async () => {
      // Arrange
      const unverifiedUser = {
        ...mockUser,
        isEmailVerified: false,
        isPhoneVerified: false,
      };
      userModel.findOne.mockResolvedValue(unverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyOtp', () => {
    const verifyOtpDto: VerifyOtpDto = {
      email: 'test@example.com',
      otpCode: '123456',
    };

    it('should verify OTP successfully with email', async () => {
      // Arrange
      const user = {
        ...mockUser,
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };
      userModel.findOne.mockResolvedValue(user);
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      // Act
      const result = await service.verifyOtp(verifyOtpDto);

      // Assert
      expect(userModel.findOne).toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Account verified successfully');
    });

    it('should verify OTP successfully with phone', async () => {
      // Arrange
      const phoneOtpDto: VerifyOtpDto = {
        phone: '+1234567890',
        otpCode: '123456',
      };
      const user = {
        ...mockUser,
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      };
      userModel.findOne.mockResolvedValue(user);
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      // Act
      const result = await service.verifyOtp(phoneOtpDto);

      // Assert
      expect(result).toHaveProperty('message', 'Account verified successfully');
    });

    it('should throw BadRequestException when neither email nor phone provided', async () => {
      // Arrange
      const invalidDto: VerifyOtpDto = {
        otpCode: '123456',
      } as VerifyOtpDto;

      // Act & Assert
      await expect(service.verifyOtp(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when OTP code is invalid', async () => {
      // Arrange
      const user = {
        ...mockUser,
        otpCode: '999999',
      };
      userModel.findOne.mockResolvedValue(user);

      // Act & Assert
      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when OTP is expired', async () => {
      // Arrange
      const user = {
        ...mockUser,
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() - 1000),
      };
      userModel.findOne.mockResolvedValue(user);

      // Act & Assert
      await expect(service.verifyOtp(verifyOtpDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh token successfully', async () => {
      // Arrange
      const payload = { sub: mockUser._id.toString() };
      jwtService.verify.mockReturnValue(payload);
      userModel.findById.mockResolvedValue({
        ...mockUser,
        refreshToken,
      });
      jwtService.signAsync.mockResolvedValueOnce('new-access-token');
      jwtService.signAsync.mockResolvedValueOnce('new-refresh-token');
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      expect(jwtService.verify).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const payload = { sub: mockUser._id.toString() };
      jwtService.verify.mockReturnValue(payload);
      userModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const payload = { sub: mockUser._id.toString() };
      jwtService.verify.mockReturnValue(payload);
      userModel.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token mismatch', async () => {
      // Arrange
      const payload = { sub: mockUser._id.toString() };
      jwtService.verify.mockReturnValue(payload);
      userModel.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'different-token',
      });

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@example.com',
    };

    it('should send password reset token successfully', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      process.env.NODE_ENV = 'development';

      // Act
      const result = await service.forgotPassword(forgotPasswordDto);

      // Assert
      expect(userModel.findOne).toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('resetToken');
    });

    it('should return success message even when user not found (security)', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      // Act
      const result = await service.forgotPassword(forgotPasswordDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.resetToken).toBeUndefined();
    });

    it('should not return reset token in production', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      process.env.NODE_ENV = 'production';

      // Act
      const result = await service.forgotPassword(forgotPasswordDto);

      // Assert
      expect(result.resetToken).toBeUndefined();
    });

    it('should throw BadRequestException when neither email nor phone provided', async () => {
      // Arrange
      const invalidDto: ForgotPasswordDto = {} as ForgotPasswordDto;

      // Act & Assert
      await expect(service.forgotPassword(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'valid-reset-token',
      password: 'newPassword123',
    };

    it('should reset password successfully', async () => {
      // Arrange
      const user = {
        ...mockUser,
        passwordResetToken: 'valid-reset-token',
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      };
      userModel.findOne.mockResolvedValue(user);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      // Act
      const result = await service.resetPassword(resetPasswordDto);

      // Assert
      expect(userModel.findOne).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(resetPasswordDto.password, 10);
      expect(result).toHaveProperty('message', 'Password reset successfully');
    });

    it('should throw BadRequestException when token is invalid', async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token is expired', async () => {
      // Arrange
      const user = {
        ...mockUser,
        passwordResetToken: 'valid-reset-token',
        passwordResetExpires: new Date(Date.now() - 1000),
      };
      userModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user when valid and active', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(mockUser._id.toString());

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith(mockUser._id.toString());
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);

      // Act
      const result = await service.validateUser(mockUser._id.toString());

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      // Arrange
      const inactiveUser = {
        ...mockUser,
        isActive: false,
      };
      userModel.findById.mockResolvedValue(inactiveUser);

      // Act
      const result = await service.validateUser(mockUser._id.toString());

      // Assert
      expect(result).toBeNull();
    });
  });
});


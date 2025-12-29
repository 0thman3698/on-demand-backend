import { UserRole } from '../../auth/schemas/user.schema';

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


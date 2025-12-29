import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/schemas/user.schema';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(UserRole.USER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: any,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingsService.create(user.userId, createBookingDto);
  }

  @Get(':id')
  @Roles(UserRole.USER, UserRole.PROVIDER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.findOne(id, user.userId, user.role);
  }

  @Patch(':id/status')
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, user.userId, updateStatusDto);
  }

  @Get('user/me')
  @Roles(UserRole.USER)
  @HttpCode(HttpStatus.OK)
  async getUserBookings(@CurrentUser() user: any) {
    return this.bookingsService.getUserBookings(user.userId);
  }

  @Get('provider/me')
  @Roles(UserRole.PROVIDER)
  @HttpCode(HttpStatus.OK)
  async getProviderBookings(@CurrentUser() user: any) {
    return this.bookingsService.getProviderBookings(user.userId);
  }
}

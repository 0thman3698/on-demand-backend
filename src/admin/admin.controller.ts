import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ProviderDecisionDto } from './dto/provider-decision.dto';
import { AccountStatusDto } from './dto/account-status.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Provider Approval Endpoints
  @Get('providers/pending')
  @HttpCode(HttpStatus.OK)
  async getPendingProviders() {
    return this.adminService.getPendingProviders();
  }

  @Patch('providers/:providerId/approve')
  @HttpCode(HttpStatus.OK)
  async approveProvider(
    @Param('providerId') providerId: string,
    @Body() decisionDto: ProviderDecisionDto,
  ) {
    return this.adminService.approveProvider(providerId, decisionDto);
  }

  @Patch('providers/:providerId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectProvider(
    @Param('providerId') providerId: string,
    @Body() decisionDto: ProviderDecisionDto,
  ) {
    return this.adminService.rejectProvider(providerId, decisionDto);
  }

  // Account Moderation Endpoints
  @Patch('users/:userId/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('userId') userId: string,
    @Body() statusDto: AccountStatusDto,
  ) {
    return this.adminService.suspendUser(userId, statusDto);
  }

  @Patch('users/:userId/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId') userId: string,
    @Body() statusDto: AccountStatusDto,
  ) {
    return this.adminService.banUser(userId, statusDto);
  }

  @Patch('providers/:providerId/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendProvider(
    @Param('providerId') providerId: string,
    @Body() statusDto: AccountStatusDto,
  ) {
    return this.adminService.suspendProvider(providerId, statusDto);
  }

  @Patch('providers/:providerId/ban')
  @HttpCode(HttpStatus.OK)
  async banProvider(
    @Param('providerId') providerId: string,
    @Body() statusDto: AccountStatusDto,
  ) {
    return this.adminService.banProvider(providerId, statusDto);
  }

  // Analytics Endpoints
  @Get('analytics/overview')
  @HttpCode(HttpStatus.OK)
  async getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  @Get('analytics/bookings')
  @HttpCode(HttpStatus.OK)
  async getBookingsAnalytics(@Query() queryDto: AnalyticsQueryDto) {
    return this.adminService.getBookingsAnalytics(queryDto);
  }

  @Get('analytics/revenue')
  @HttpCode(HttpStatus.OK)
  async getRevenueAnalytics(@Query() queryDto: AnalyticsQueryDto) {
    return this.adminService.getRevenueAnalytics(queryDto);
  }
}

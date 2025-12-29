import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/schemas/user.schema';

@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  async apply(
    @CurrentUser() user: any,
    @Body() createProviderDto: CreateProviderDto,
  ) {
    return this.providersService.apply(user.userId, createProviderDto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: any) {
    return this.providersService.getProfile(user.userId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return this.providersService.updateProfile(user.userId, updateProviderDto);
  }

  @Patch('availability')
  @HttpCode(HttpStatus.OK)
  async updateAvailability(
    @CurrentUser() user: any,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    return this.providersService.updateAvailability(
      user.userId,
      updateAvailabilityDto,
    );
  }
}


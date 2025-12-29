import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/schemas/user.schema';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: { userId: string; role: string },
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.userId, createReviewDto);
  }

  @Get('providers/:providerId/reviews')
  @HttpCode(HttpStatus.OK)
  async getProviderReviews(@Param('providerId') providerId: string) {
    return this.reviewsService.getProviderReviews(providerId);
  }
}

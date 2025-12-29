import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/schemas/user.schema';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @HttpCode(HttpStatus.CREATED)
  async createPaymentIntent(
    @CurrentUser() user: { userId: string; role: string },
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(
      user.userId,
      createPaymentIntentDto,
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() paymentWebhookDto: PaymentWebhookDto,
    @Headers('x-payment-signature') signature: string,
    @Headers('stripe-signature') stripeSignature: string,
  ) {
    // Extract signature from headers (support multiple payment providers)
    const webhookSignature =
      signature || stripeSignature || paymentWebhookDto.signature;

    if (webhookSignature) {
      paymentWebhookDto.signature = webhookSignature;
    }

    return this.paymentsService.handleWebhook(paymentWebhookDto);
  }
}

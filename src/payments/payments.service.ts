import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentStatus } from './schemas/payment.schema';
import { Booking } from '../bookings/schemas/booking.schema';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { User } from '../auth/schemas/user.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(
    private configService: ConfigService,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Create payment intent for a booking
   * Only USER can initiate payment
   */
  async createPaymentIntent(
    userId: string,
    createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    // Verify booking exists
    const booking = await this.bookingModel.findById(
      createPaymentIntentDto.bookingId,
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify booking belongs to the user
    if (booking.userId.toString() !== userId) {
      throw new ForbiddenException(
        'You can only create payment for your own bookings',
      );
    }

    // Verify booking status is valid for payment
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.ACCEPTED
    ) {
      throw new BadRequestException(
        `Cannot create payment for booking with status: ${booking.status}. ` +
          `Booking must be PENDING or ACCEPTED`,
      );
    }

    // Check if payment already exists
    const existingPayment = await this.paymentModel.findOne({
      bookingId: createPaymentIntentDto.bookingId,
    });

    if (existingPayment) {
      // If payment is already succeeded, return existing payment
      if (existingPayment.status === PaymentStatus.SUCCEEDED) {
        return {
          paymentId: existingPayment._id,
          clientSecret: existingPayment.clientSecret,
          paymentLink: existingPayment.paymentLink,
          status: existingPayment.status,
          message: 'Payment already completed',
        };
      }

      // If payment is pending or processing, return existing payment
      if (
        existingPayment.status === PaymentStatus.PENDING ||
        existingPayment.status === PaymentStatus.PROCESSING
      ) {
        return {
          paymentId: existingPayment._id,
          clientSecret: existingPayment.clientSecret,
          paymentLink: existingPayment.paymentLink,
          status: existingPayment.status,
          message: 'Payment intent already exists',
        };
      }

      // If payment failed, create a new payment intent
    }

    // Generate payment intent ID (in production, this would come from payment gateway)
    const paymentIntentId = this.generatePaymentIntentId();
    const clientSecret = this.generateClientSecret(paymentIntentId);
    const paymentLink = this.generatePaymentLink(paymentIntentId);

    // Create payment record
    const payment = new this.paymentModel({
      bookingId: new Types.ObjectId(createPaymentIntentDto.bookingId),
      userId: new Types.ObjectId(userId),
      amount: booking.price,
      status: PaymentStatus.PENDING,
      paymentMethod: createPaymentIntentDto.paymentMethod,
      paymentIntentId,
      clientSecret,
      paymentLink,
      provider: this.configService.get<string>('PAYMENT_PROVIDER') || 'stripe',
    });

    await payment.save();

    return {
      paymentId: payment._id,
      bookingId: booking._id,
      amount: booking.price,
      clientSecret,
      paymentLink,
      status: payment.status,
      paymentIntentId,
    };
  }

  /**
   * Handle payment webhook from 3rd-party payment provider
   */
  async handleWebhook(paymentWebhookDto: PaymentWebhookDto) {
    // Verify webhook signature (in production, validate with payment provider)
    const isValidSignature = this.verifyWebhookSignature(
      paymentWebhookDto.signature,
      paymentWebhookDto,
    );

    if (!isValidSignature && this.configService.get<string>('NODE_ENV') !== 'development') {
      throw new ForbiddenException('Invalid webhook signature');
    }

    // Find payment by payment intent ID
    const payment = await this.paymentModel.findOne({
      paymentIntentId: paymentWebhookDto.paymentIntentId,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Ignore if payment is already succeeded or cancelled
    if (
      payment.status === PaymentStatus.SUCCEEDED ||
      payment.status === PaymentStatus.CANCELLED
    ) {
      return {
        message: 'Payment already processed',
        paymentId: payment._id,
        status: payment.status,
      };
    }

    // Handle different webhook events
    switch (paymentWebhookDto.event) {
      case 'payment.succeeded':
      case 'payment_intent.succeeded':
        return await this.handlePaymentSuccess(payment, paymentWebhookDto);

      case 'payment.failed':
      case 'payment_intent.failed':
        return await this.handlePaymentFailure(payment, paymentWebhookDto);

      case 'payment.cancelled':
      case 'payment_intent.cancelled':
        return await this.handlePaymentCancellation(payment, paymentWebhookDto);

      default:
        throw new BadRequestException(
          `Unsupported webhook event: ${paymentWebhookDto.event}`,
        );
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(
    payment: Payment,
    webhookData: PaymentWebhookDto,
  ) {
    // Update payment status
    payment.status = PaymentStatus.SUCCEEDED;
    payment.transactionId = webhookData.transactionId;
    payment.paidAt = new Date();
    payment.metadata = webhookData.data || {};
    await payment.save();

    // Update booking status to COMPLETED
    const booking = await this.bookingModel.findById(payment.bookingId);
    if (booking && booking.status !== BookingStatus.COMPLETED) {
      booking.status = BookingStatus.COMPLETED;
      await booking.save();
    }

    // TODO: Trigger notification event
    // await this.notificationService.sendPaymentConfirmation(payment.userId, payment.bookingId);

    return {
      message: 'Payment processed successfully',
      paymentId: payment._id,
      bookingId: payment.bookingId,
      status: payment.status,
    };
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(
    payment: Payment,
    webhookData: PaymentWebhookDto,
  ) {
    payment.status = PaymentStatus.FAILED;
    payment.failureReason =
      typeof webhookData.data?.failure_reason === 'string'
        ? webhookData.data.failure_reason
        : typeof webhookData.data?.message === 'string'
          ? webhookData.data.message
          : 'Payment failed';
    payment.metadata =
      typeof webhookData.data === 'object' && webhookData.data !== null
        ? webhookData.data
        : {};
    await payment.save();

    // TODO: Trigger notification event
    // await this.notificationService.sendPaymentFailure(payment.userId, payment.bookingId);

    return {
      message: 'Payment failed',
      paymentId: payment._id,
      status: payment.status,
      failureReason: payment.failureReason,
    };
  }

  /**
   * Handle cancelled payment
   */
  private async handlePaymentCancellation(
    payment: Payment,
    webhookData: PaymentWebhookDto,
  ) {
    payment.status = PaymentStatus.CANCELLED;
    payment.metadata = webhookData.data || {};
    await payment.save();

    return {
      message: 'Payment cancelled',
      paymentId: payment._id,
      status: payment.status,
    };
  }

  /**
   * Verify webhook signature
   * In production, implement actual signature verification based on payment provider
   */
  private verifyWebhookSignature(
    signature: string | undefined,
    webhookData: PaymentWebhookDto,
  ): boolean {
    // In development, skip signature verification
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      return true;
    }

    // In production, verify signature using payment provider's secret
    // Example for Stripe:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // return stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    // For now, return true if signature exists
    return !!signature;
  }

  /**
   * Generate payment intent ID
   * In production, this would come from payment gateway API
   */
  private generatePaymentIntentId(): string {
    const prefix = this.configService.get<string>('PAYMENT_PROVIDER') || 'stripe';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${prefix}_pi_${timestamp}_${random}`;
  }

  /**
   * Generate client secret
   * In production, this would come from payment gateway API
   */
  private generateClientSecret(paymentIntentId: string): string {
    return `${paymentIntentId}_secret_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate payment link
   * In production, this would come from payment gateway API
   */
  private generatePaymentLink(paymentIntentId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl}/payments/confirm/${paymentIntentId}`;
  }

  /**
   * Get payment by booking ID
   */
  async getPaymentByBookingId(bookingId: string) {
    const payment = await this.paymentModel
      .findOne({ bookingId })
      .populate('bookingId')
      .populate('userId', 'name email')
      .lean();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}

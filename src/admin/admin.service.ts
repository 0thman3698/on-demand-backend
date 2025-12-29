import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '../auth/schemas/user.schema';
import { Provider } from '../providers/schemas/provider.schema';
import { Booking, BookingStatus } from '../bookings/schemas/booking.schema';
import { Payment, PaymentStatus } from '../payments/schemas/payment.schema';
import { ProviderDecisionDto } from './dto/provider-decision.dto';
import { AccountStatusDto } from './dto/account-status.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Provider.name) private providerModel: Model<Provider>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
  ) {}

  /**
   * Get pending provider applications
   */
  async getPendingProviders() {
    const providers = await this.providerModel
      .find({ verified: false })
      .populate('userId', 'name email phone')
      .populate('services', 'name category')
      .sort({ createdAt: 1 })
      .lean();
    if (!providers) {
      throw new NotFoundException('Providers not found');
    }

    return providers;
  }

  /**
   * Approve a provider
   */
  async approveProvider(providerId: string, decisionDto: ProviderDecisionDto) {
    const provider = await this.providerModel.findById(providerId);

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.verified) {
      throw new BadRequestException('Provider is already verified');
    }

    // Approve provider
    provider.verified = true;
    await provider.save();

    return {
      message: 'Provider approved successfully',
      providerId: provider._id,
      verified: provider.verified,
    };
  }

  /**
   * Reject a provider
   */
  async rejectProvider(providerId: string, decisionDto: ProviderDecisionDto) {
    const provider = await this.providerModel.findById(providerId);

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.verified) {
      throw new BadRequestException(
        'Cannot reject an already verified provider',
      );
    }

    // Store rejection reason
    if (decisionDto.reason) {
      provider.rejectionReason = decisionDto.reason;
    }

    await provider.save();

    return {
      message: 'Provider rejected',
      providerId: provider._id,
      reason: decisionDto.reason,
    };
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, statusDto: AccountStatusDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    await user.save();

    return {
      message: 'User suspended successfully',
      userId: user._id,
      isActive: user.isActive,
      reason: statusDto.reason,
    };
  }

  /**
   * Ban a user
   */
  async banUser(userId: string, statusDto: AccountStatusDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    // You could add a banned field to the schema if needed
    await user.save();

    return {
      message: 'User banned successfully',
      userId: user._id,
      isActive: user.isActive,
      reason: statusDto.reason,
    };
  }

  /**
   * Suspend a provider
   */
  async suspendProvider(providerId: string, statusDto: AccountStatusDto) {
    const provider = await this.providerModel.findById(providerId);

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Suspend the associated user account
    const user = await this.userModel.findById(provider.userId);
    if (user) {
      user.isActive = false;
      await user.save();
    }

    return {
      message: 'Provider suspended successfully',
      providerId: provider._id,
      userId: provider.userId,
      reason: statusDto.reason,
    };
  }

  /**
   * Ban a provider
   */
  async banProvider(providerId: string, statusDto: AccountStatusDto) {
    const provider = await this.providerModel.findById(providerId);

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Ban the associated user account
    const user = await this.userModel.findById(provider.userId);
    if (user) {
      user.isActive = false;
      await user.save();
    }

    return {
      message: 'Provider banned successfully',
      providerId: provider._id,
      userId: provider.userId,
      reason: statusDto.reason,
    };
  }

  /**
   * Get analytics overview
   */
  async getAnalyticsOverview() {
    const [totalUsers, totalProviders, activeBookings, completedBookings] =
      await Promise.all([
        this.userModel.countDocuments({ role: UserRole.USER }),
        this.providerModel.countDocuments({ verified: true }),
        this.bookingModel.countDocuments({
          status: {
            $in: [
              BookingStatus.PENDING,
              BookingStatus.ACCEPTED,
              BookingStatus.ON_THE_WAY,
              BookingStatus.STARTED,
            ],
          },
        }),
        this.bookingModel.countDocuments({ status: BookingStatus.COMPLETED }),
      ]);

    return {
      users: {
        total: totalUsers,
      },
      providers: {
        total: totalProviders,
      },
      bookings: {
        active: activeBookings,
        completed: completedBookings,
        total: activeBookings + completedBookings,
      },
    };
  }

  /**
   * Get bookings analytics
   */
  async getBookingsAnalytics(queryDto: AnalyticsQueryDto) {
    const matchStage: Record<string, any> = {};

    // Apply date filter if provided
    if (queryDto.startDate || queryDto.endDate) {
      matchStage.createdAt = {};
      if (queryDto.startDate) {
        matchStage.createdAt.$gte = new Date(queryDto.startDate);
      }
      if (queryDto.endDate) {
        matchStage.createdAt.$lte = new Date(queryDto.endDate);
      }
    }

    // Group by status
    const statusGroups = await this.bookingModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Group by day (daily volume)
    const dailyVolume = await this.bookingModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }, // Last 30 days
    ]);

    return {
      byStatus: statusGroups.map((group) => ({
        status: group._id,
        count: group.count,
      })),
      dailyVolume: dailyVolume.map((day) => ({
        date: day._id,
        count: day.count,
      })),
    };
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(queryDto: AnalyticsQueryDto) {
    const matchStage: any = {
      status: PaymentStatus.SUCCEEDED,
    };

    // Apply date filter if provided
    if (queryDto.startDate || queryDto.endDate) {
      matchStage.paidAt = {};
      if (queryDto.startDate) {
        matchStage.paidAt.$gte = new Date(queryDto.startDate);
      }
      if (queryDto.endDate) {
        matchStage.paidAt.$lte = new Date(queryDto.endDate);
      }
    }

    // Calculate total revenue
    const revenueData = await this.paymentModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$amount' },
        },
      },
    ]);

    // Revenue by day
    const dailyRevenue = await this.paymentModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paidAt' },
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }, // Last 30 days
    ]);

    return {
      totalRevenue: revenueData[0]?.totalRevenue || 0,
      totalTransactions: revenueData[0]?.totalTransactions || 0,
      averageTransaction: revenueData[0]?.averageTransaction || 0,
      dailyRevenue: dailyRevenue.map((day) => ({
        date: day._id,
        revenue: day.revenue,
        transactions: day.transactions,
      })),
    };
  }
}

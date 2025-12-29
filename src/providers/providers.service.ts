import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserRole } from '../auth/schemas/user.schema';
import { AvailabilityStatus, Provider } from './schemas/provider.schema';
import { CreateProviderDto, ServiceAreaDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { Service } from '../services/schemas/service.schema';

type UpdateProviderData = {
  services?: Types.ObjectId[];
  expertise?: string;
  bio?: string;
  certifications?: string[];
  idDocument?: string;
  pricing?: Record<string, number>;
  serviceArea?: ServiceAreaDto;
  availabilityStatus?: AvailabilityStatus;
};

@Injectable()
export class ProvidersService {
  constructor(
    @InjectModel(Provider.name) private providerModel: Model<Provider>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Service.name) private serviceModel: Model<Service>,
  ) {}

  /**
   * Apply to become a provider
   */
  async apply(userId: string, createProviderDto: CreateProviderDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Only users with PROVIDER role can apply');
    }

    const existingProvider = await this.providerModel.findOne({ userId });
    if (existingProvider) {
      throw new ConflictException('Provider profile already exists');
    }

    if (createProviderDto.weeklySchedule) {
      this.validateWeeklySchedule(createProviderDto.weeklySchedule);
    }

    const validatedServices = await this.validateServicesAndPricing(
      createProviderDto.services,
      createProviderDto.pricing,
    );

    const provider = new this.providerModel({
      userId,
      services: validatedServices,
      expertise: createProviderDto.expertise,
      bio: createProviderDto.bio,
      certifications: createProviderDto.certifications || [],
      idDocument: createProviderDto.idDocument,
      weeklySchedule: createProviderDto.weeklySchedule,
      pricing: createProviderDto.pricing || {},
      serviceArea: createProviderDto.serviceArea,
      availabilityStatus: createProviderDto.availabilityStatus || 'AVAILABLE',
      verified: false,
    });

    await provider.save();

    return {
      message:
        'Provider application submitted successfully. Awaiting admin verification.',
      providerId: provider._id,
      verified: provider.verified,
    };
  }

  /**
   * Get provider profile
   */
  async getProfile(userId: string) {
    const provider = await this.providerModel
      .findOne({ userId })
      .populate('userId', 'name email phone')
      .populate('services', 'name categoryId basePrice duration isActive')
      .lean();

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    return provider;
  }

  /**
   * Update provider profile
   */
  async updateProfile(userId: string, updateProviderDto: UpdateProviderDto) {
    const provider = await this.providerModel.findOne({ userId });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    const updateData: UpdateProviderData = {};

    if (updateProviderDto.services !== undefined) {
      const validatedServices = await this.validateServicesAndPricing(
        updateProviderDto.services,
        updateProviderDto.pricing ??
          (provider.pricing instanceof Map
            ? Object.fromEntries(provider.pricing)
            : (provider.pricing as Record<string, number>)),
      );
      updateData.services = validatedServices;
    }

    if (updateProviderDto.expertise !== undefined) {
      updateData.expertise = updateProviderDto.expertise;
    }
    if (updateProviderDto.bio !== undefined) {
      updateData.bio = updateProviderDto.bio;
    }
    if (updateProviderDto.certifications !== undefined) {
      updateData.certifications = updateProviderDto.certifications;
    }
    if (updateProviderDto.idDocument !== undefined) {
      updateData.idDocument = updateProviderDto.idDocument;
    }
    if (updateProviderDto.pricing !== undefined) {
      const pricingServices =
        updateProviderDto.services ??
        provider.services.map((s) => s.toString());
      await this.validateServicesAndPricing(
        pricingServices,
        updateProviderDto.pricing,
      );
      updateData.pricing = updateProviderDto.pricing;
    }
    if (updateProviderDto.serviceArea !== undefined) {
      updateData.serviceArea = updateProviderDto.serviceArea;
    }

    const updatedProvider = await this.providerModel
      .findByIdAndUpdate(provider._id, updateData, { new: true })
      .lean();

    if (!updatedProvider) {
      throw new NotFoundException('Provider profile not found');
    }

    return updatedProvider;
  }

  /**
   * Update provider availability
   */
  async updateAvailability(
    userId: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    const provider = await this.providerModel.findOne({ userId });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    if (updateAvailabilityDto.weeklySchedule) {
      this.validateWeeklySchedule(updateAvailabilityDto.weeklySchedule);
    }

    const updatedProvider = await this.providerModel
      .findByIdAndUpdate(provider._id, updateAvailabilityDto, { new: true })
      .lean();
    if (!updatedProvider) {
      throw new NotFoundException('Provider profile not found');
    }

    return updatedProvider;
  }

  /**
   * Validate weekly schedule format
   */
  private validateWeeklySchedule(schedule: any) {
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    for (const day of days) {
      if (!schedule?.[day]) continue;

      const { start, end } = schedule[day];

      if (!start || !end) {
        throw new BadRequestException(
          `${day} schedule must have both start and end times`,
        );
      }

      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(start) || !timeRegex.test(end)) {
        throw new BadRequestException(
          `${day} schedule times must be in HH:mm format`,
        );
      }

      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);

      if (sh * 60 + sm >= eh * 60 + em) {
        throw new BadRequestException(
          `${day} start time must be before end time`,
        );
      }
    }
  }

  /**
   * Validate services & pricing
   */
  private async validateServicesAndPricing(
    serviceIds: string[],
    pricing?: Record<string, number>,
  ): Promise<Types.ObjectId[]> {
    if (!serviceIds?.length) {
      throw new BadRequestException('At least one service must be provided');
    }

    const uniqueIds = [...new Set(serviceIds)];
    const invalid = uniqueIds.find((id) => !Types.ObjectId.isValid(id));
    if (invalid) {
      throw new BadRequestException(`Invalid service id: ${invalid}`);
    }

    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));

    const services = await this.serviceModel.find({
      _id: { $in: objectIds },
      isActive: true,
      deletedAt: null,
    });

    if (services.length !== objectIds.length) {
      throw new BadRequestException(
        'One or more services are invalid, inactive, or deleted',
      );
    }

    if (pricing) {
      const set = new Set(uniqueIds);
      for (const [k, v] of Object.entries(pricing)) {
        if (!set.has(k) || typeof v !== 'number' || v < 0) {
          throw new BadRequestException('Invalid pricing data');
        }
      }
    }

    return objectIds;
  }

  /**
   * Check if provider is verified
   */
  async isProviderVerified(userId: string): Promise<boolean> {
    const provider = await this.providerModel.findOne({ userId });
    return !!provider?.verified;
  }
}

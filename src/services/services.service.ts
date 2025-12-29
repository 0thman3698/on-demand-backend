import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service } from './schemas/service.schema';
import { Category } from '../categories/schemas/category.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<Service>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  /**
   * Create a new service
   * Only ADMIN can create services
   * Validates category exists and is active
   */
  async create(createServiceDto: CreateServiceDto) {
    // Validate category exists and is active
    const category = await this.categoryModel.findOne({
      _id: createServiceDto.categoryId,
      deletedAt: null,
      isActive: true,
    });

    if (!category) {
      throw new BadRequestException(
        'Category not found or is inactive. Cannot create service.',
      );
    }

    // Check if service with same name already exists in the same category (case-insensitive)
    const existingService = await this.serviceModel.findOne({
      name: { $regex: new RegExp(`^${createServiceDto.name}$`, 'i') },
      categoryId: createServiceDto.categoryId,
      deletedAt: null,
    });

    if (existingService) {
      throw new ConflictException(
        `Service with name "${createServiceDto.name}" already exists in this category`,
      );
    }

    const service = new this.serviceModel({
      name: createServiceDto.name.trim(),
      description: createServiceDto.description?.trim(),
      basePrice: createServiceDto.basePrice,
      duration: createServiceDto.duration,
      categoryId: createServiceDto.categoryId,
      isActive: true,
    });

    await service.save();

    return service;
  }

  /**
   * Get all services with pagination and filtering
   * Public endpoint
   */
  async findAll(queryDto: QueryServiceDto) {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      categoryId,
      sortBy = 'name',
      sortOrder = 'asc',
    } = queryDto;

    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, any> = { deletedAt: null };

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    const sort: Record<string, any> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [services, total] = await Promise.all([
      this.serviceModel
        .find(query)
        .select(
          'name description basePrice duration categoryId isActive createdAt updatedAt',
        )
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.serviceModel.countDocuments(query),
    ]);

    return {
      services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get service by ID
   * Public endpoint
   */
  async findOne(id: string) {
    const service = await this.serviceModel
      .findOne({ _id: id, deletedAt: null })
      .lean();

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  /**
   * Get services by category ID
   * Public endpoint
   */
  async findByCategory(categoryId: string, isActive?: boolean) {
    const query: Record<string, any> = {
      categoryId,
      deletedAt: null,
    };

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const services = await this.serviceModel
      .find(query)
      .select('name description basePrice duration isActive')
      .sort({ name: 1 });

    return services;
  }

  /**
   * Update service
   * Only ADMIN can update services
   * Validates category if being changed
   */
  async update(id: string, updateServiceDto: UpdateServiceDto) {
    const service = await this.serviceModel.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Validate category if being changed
    if (updateServiceDto.categoryId) {
      const category = await this.categoryModel.findOne({
        _id: updateServiceDto.categoryId,
        deletedAt: null,
        isActive: true,
      });

      if (!category) {
        throw new BadRequestException(
          'Category not found or is inactive. Cannot update service.',
        );
      }

      // Check if service name conflicts with existing service in new category
      if (
        updateServiceDto.name ||
        updateServiceDto.categoryId !== service.categoryId.toString()
      ) {
        const nameToCheck = updateServiceDto.name || service.name;
        const categoryToCheck = updateServiceDto.categoryId;

        const existingService = await this.serviceModel.findOne({
          name: { $regex: new RegExp(`^${nameToCheck}$`, 'i') },
          categoryId: categoryToCheck,
          deletedAt: null,
          _id: { $ne: id },
        });

        if (existingService) {
          throw new ConflictException(
            `Service with name "${nameToCheck}" already exists in this category`,
          );
        }
      }
    } else if (updateServiceDto.name) {
      // Check if name conflicts with existing service in same category
      const existingService = await this.serviceModel.findOne({
        name: { $regex: new RegExp(`^${updateServiceDto.name}$`, 'i') },
        categoryId: service.categoryId,
        deletedAt: null,
        _id: { $ne: id },
      });

      if (existingService) {
        throw new ConflictException(
          `Service with name "${updateServiceDto.name}" already exists in this category`,
        );
      }
    }

    // Update fields
    if (updateServiceDto.name !== undefined) {
      service.name = updateServiceDto.name.trim();
    }
    if (updateServiceDto.description !== undefined) {
      service.description = updateServiceDto.description?.trim();
    }
    if (updateServiceDto.basePrice !== undefined) {
      service.basePrice = updateServiceDto.basePrice;
    }
    if (updateServiceDto.duration !== undefined) {
      service.duration = updateServiceDto.duration;
    }
    if (updateServiceDto.categoryId !== undefined) {
      service.categoryId = new Types.ObjectId(updateServiceDto.categoryId);
    }
    if (updateServiceDto.isActive !== undefined) {
      service.isActive = updateServiceDto.isActive;
    }

    await service.save();

    return service;
  }

  /**
   * Soft delete service
   * Only ADMIN can delete services
   * Prevents deletion if service has active bookings
   */
  async remove(id: string) {
    const service = await this.serviceModel.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check if service has active bookings
    // Note: This assumes a Booking model exists with serviceId field
    // TODO: Add booking count check when Booking module is available
    // For now, we'll just soft delete
    // const bookingCount = await this.bookingModel.countDocuments({
    //   serviceId: id,
    //   status: { $in: ['PENDING', 'ACCEPTED', 'ON_THE_WAY', 'STARTED'] },
    // });
    // if (bookingCount > 0) {
    //   throw new BadRequestException(
    //     'Cannot delete service with active bookings',
    //   );
    // }

    // Soft delete
    service.deletedAt = new Date();
    service.isActive = false;
    await service.save();

    return {
      message: 'Service deleted successfully',
      id: service._id,
    };
  }

  /**
   * Get active services only (for public use)
   */
  async findActive(categoryId?: string) {
    const query: Record<string, any> = {
      isActive: true,
      deletedAt: null,
    };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    const services = await this.serviceModel
      .find(query)
      .select(
        'name description basePrice duration categoryId isActive createdAt updatedAt',
      )
      .sort({ name: 1 });

    return services;
  }
}

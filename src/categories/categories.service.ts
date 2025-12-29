import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  /**
   * Create a new category
   * Only ADMIN can create categories
   */
  async create(createCategoryDto: CreateCategoryDto) {
    // Check if category with same name already exists (case-insensitive)
    const existingCategory = await this.categoryModel.findOne({
      name: { $regex: new RegExp(`^${createCategoryDto.name}$`, 'i') },
      deletedAt: null,
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${createCategoryDto.name}" already exists`,
      );
    }

    const category = new this.categoryModel({
      name: createCategoryDto.name.trim(),
      description: createCategoryDto.description?.trim(),
      icon: createCategoryDto.icon,
      isActive: true,
    });

    await category.save();

    return category;
  }

  /**
   * Get all categories with pagination and filtering
   * Public endpoint
   */
  async findAll(queryDto: QueryCategoryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc',
    } = queryDto;

    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, any> = { deletedAt: null };

    if (isActive !== undefined) {
      query.isActive = isActive;
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
    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(query)
        .select('name description icon isActive')
        .sort(sort)
        .skip(skip)
        .limit(limit),

      this.categoryModel.countDocuments(query),
    ]);

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get category by ID
   * Public endpoint
   */
  async findOne(id: string) {
    const category = await this.categoryModel
      .findOne({ _id: id, deletedAt: null })
      .lean();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Update category
   * Only ADMIN can update categories
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryModel
      .findOne({
        _id: id,
        deletedAt: null,
      })
      .lean();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if name is being changed and conflicts with existing category
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryModel.findOne({
        name: { $regex: new RegExp(`^${updateCategoryDto.name}$`, 'i') },
        deletedAt: null,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists`,
        );
      }
    }

    // Update fields
    if (updateCategoryDto.name !== undefined) {
      category.name = updateCategoryDto.name.trim();
    }
    if (updateCategoryDto.description !== undefined) {
      category.description = updateCategoryDto.description?.trim();
    }
    if (updateCategoryDto.icon !== undefined) {
      category.icon = updateCategoryDto.icon;
    }
    if (updateCategoryDto.isActive !== undefined) {
      category.isActive = updateCategoryDto.isActive;
    }

    await category.save();

    return category;
  }

  /**
   * Soft delete category
   * Only ADMIN can delete categories
   * Prevents deletion if category has active services
   */
  async remove(id: string) {
    const category = await this.categoryModel.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has active services
    // Note: This assumes a Service model exists with categoryId field
    // For now, we'll just soft delete
    // TODO: Add service count check when Service module is implemented
    // const serviceCount = await this.serviceModel.countDocuments({
    //   categoryId: id,
    //   isActive: true,
    // });
    // if (serviceCount > 0) {
    //   throw new BadRequestException(
    //     'Cannot delete category with active services',
    //   );
    // }

    // Soft delete
    category.deletedAt = new Date();
    category.isActive = false;
    await category.save();

    return {
      message: 'Category deleted successfully',
      id: category._id,
    };
  }

  /**
   * Get active categories only (for public use)
   */
  async findActive() {
    const categories = await this.categoryModel
      .find({ isActive: true, deletedAt: null })
      .select('name description icon')
      .sort({ name: 1 })
      .lean();

    return categories;
  }
}

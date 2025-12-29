import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CategoriesService } from './categories.service';
import { Category } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryModel: any;

  const mockCategory = {
    _id: new Types.ObjectId(),
    name: 'Test Category',
    description: 'Test description',
    icon: 'test-icon',
    isActive: true,
    deletedAt: null,
    save: jest.fn(),
  };

  beforeEach(async () => {
    const MockCategoryModel = jest.fn().mockImplementation((doc) => ({
      ...doc,
      save: jest.fn().mockResolvedValue(doc),
    }));

    MockCategoryModel.findOne = jest.fn();
    MockCategoryModel.find = jest.fn();
    MockCategoryModel.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getModelToken(Category.name), useValue: MockCategoryModel },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoryModel = module.get(getModelToken(Category.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // CREATE
  // ========================================
  describe('create', () => {
    const createDto: CreateCategoryDto = {
      name: 'Test Category',
      description: 'Test description',
      icon: 'icon',
    };

    it('should create category successfully', async () => {
      categoryModel.findOne.mockResolvedValue(null);
      categoryModel.mockImplementation(() => ({
        ...mockCategory,
        save: jest.fn().mockResolvedValue(mockCategory),
      }));

      const result = await service.create(createDto);
      expect(result).toHaveProperty('name', createDto.name);
      expect(categoryModel.findOne).toHaveBeenCalled();
    });

    it('should throw ConflictException when category exists', async () => {
      categoryModel.findOne.mockResolvedValue(mockCategory);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ========================================
  // FIND ONE
  // ========================================
  describe('findOne', () => {
    it('should return category', async () => {
      categoryModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockCategory),
      });

      const result = await service.findOne(mockCategory._id.toString());
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when not found', async () => {
      categoryModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========================================
  // UPDATE
  // ========================================
  describe('update', () => {
    const updateDto: UpdateCategoryDto = { name: 'Updated Name' };

    it('should update successfully', async () => {
      const updateDto: UpdateCategoryDto = { name: 'Updated Name' };

      // call 1: get the original category (lean)
      categoryModel.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue({ ...mockCategory }),
        })
        // call 2: check if the new name exists (no lean)
        .mockResolvedValueOnce(null); // هيرجع null فعليًا

      // mock save على النسخة الأصلية
      mockCategory.save.mockResolvedValue({ ...mockCategory, ...updateDto });

      const result = await service.update(
        mockCategory._id.toString(),
        updateDto,
      );

      expect(result).toHaveProperty('name', updateDto.name);
      expect(mockCategory.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException', async () => {
      categoryModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });
      await expect(service.update('invalid-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for name conflict', async () => {
      categoryModel.findOne
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockCategory),
        }) // call 1: get the original category
        .mockReturnValueOnce({
          lean: jest
            .fn()
            .mockResolvedValue({ ...mockCategory, _id: new Types.ObjectId() }),
        }); // call 2: check if the new name is already taken by another category

      await expect(
        service.update(mockCategory._id.toString(), updateDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ========================================
  // REMOVE
  // ========================================
  describe('remove', () => {
    it('should soft delete', async () => {
      categoryModel.findOne.mockResolvedValue(mockCategory);
      mockCategory.save.mockResolvedValue(mockCategory);

      const result = await service.remove(mockCategory._id.toString());
      expect(result).toHaveProperty('message');
      expect(mockCategory.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException', async () => {
      categoryModel.findOne.mockResolvedValue(null);
      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========================================
  // FIND ACTIVE
  // ========================================
  describe('findActive', () => {
    it('should return active categories', async () => {
      categoryModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockCategory]),
      });

      const result = await service.findActive();
      expect(result).toEqual([mockCategory]);
    });
  });
});

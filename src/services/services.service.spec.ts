import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ServicesService } from './services.service';
import { Service } from './schemas/service.schema';
import { Category } from '../categories/schemas/category.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { QueryServiceDto } from './dto/query-service.dto';

describe('ServicesService', () => {
  let service: ServicesService;
  let serviceModel: any;
  let categoryModel: any;

  const mockCategory = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439016'),
    name: 'Test Category',
    isActive: true,
    deletedAt: null,
  };

  const mockService = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439015'),
    name: 'Test Service',
    description: 'Test description',
    basePrice: 100,
    duration: 60,
    categoryId: new Types.ObjectId('507f1f77bcf86cd799439016'),
    isActive: true,
    deletedAt: null,
    save: jest.fn(),
    toObject: jest.fn(),
  };

  beforeEach(async () => {
    const MockServiceModel = jest.fn().mockImplementation((doc) => {
      return {
        ...doc,
        save: jest
          .fn()
          .mockResolvedValue({ ...doc, _id: new Types.ObjectId() }),
      };
    });
    MockServiceModel.findOne = jest.fn();
    MockServiceModel.findById = jest.fn();
    MockServiceModel.find = jest.fn();
    MockServiceModel.countDocuments = jest.fn();

    const MockCategoryModel = jest.fn();
    MockCategoryModel.findOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: getModelToken(Service.name),
          useValue: MockServiceModel,
        },
        {
          provide: getModelToken(Category.name),
          useValue: MockCategoryModel,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    serviceModel = module.get(getModelToken(Service.name));
    categoryModel = module.get(getModelToken(Category.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createServiceDto: CreateServiceDto = {
      name: 'Test Service',
      description: 'Test description',
      basePrice: 100,
      duration: 60,
      categoryId: '507f1f77bcf86cd799439016',
    };

    it('should create service successfully', async () => {
      categoryModel.findOne.mockResolvedValue(mockCategory);
      serviceModel.findOne.mockResolvedValue(null);

      const savedService = {
        ...mockService,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(mockService),
      };
      serviceModel.mockImplementation(() => savedService);

      const result = await service.create(createServiceDto);

      expect(categoryModel.findOne).toHaveBeenCalled();
      expect(serviceModel.findOne).toHaveBeenCalled();
      expect(result).toHaveProperty('name', createServiceDto.name);
    });

    it('should throw BadRequestException when category not found', async () => {
      categoryModel.findOne.mockResolvedValue(null);
      await expect(service.create(createServiceDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when service name already exists', async () => {
      categoryModel.findOne.mockResolvedValue(mockCategory);
      serviceModel.findOne.mockResolvedValue(mockService);
      await expect(service.create(createServiceDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated services', async () => {
      const queryDto: QueryServiceDto = { page: 1, limit: 20 };
      const services = [mockService];
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(services),
      };
      serviceModel.find = jest.fn().mockReturnValue(queryMock);
      serviceModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by categoryId', async () => {
      const queryDto: QueryServiceDto = {
        page: 1,
        limit: 20,
        categoryId: '507f1f77bcf86cd799439016',
      };
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockService]),
      };
      serviceModel.find = jest.fn().mockReturnValue(queryMock);
      serviceModel.countDocuments.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(serviceModel.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return service by ID', async () => {
      const queryMock = {
        lean: jest.fn().mockResolvedValue(mockService),
      };
      serviceModel.findOne = jest.fn().mockReturnValue(queryMock);

      const result = await service.findOne(mockService._id.toString());

      expect(result).toEqual(mockService);
    });

    it('should throw NotFoundException when service not found', async () => {
      const queryMock = {
        lean: jest.fn().mockResolvedValue(null),
      };
      serviceModel.findOne = jest.fn().mockReturnValue(queryMock);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCategory', () => {
    it('should return services by category', async () => {
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockService]),
      };
      serviceModel.find = jest.fn().mockReturnValue(queryMock);

      const result = await service.findByCategory(mockCategory._id.toString());

      expect(result).toEqual([mockService]);
    });
  });

  describe('update', () => {
    const updateServiceDto: UpdateServiceDto = {
      name: 'Updated Service',
    };

    it('should update service successfully', async () => {
      // أول findOne: get the service by ID
      serviceModel.findOne.mockResolvedValueOnce(mockService);
      // ثاني findOne: check conflict → return null
      serviceModel.findOne.mockResolvedValueOnce(null);

      const saveMock = jest
        .fn()
        .mockResolvedValue({ ...mockService, ...updateServiceDto });
      mockService.save = saveMock;

      const result = await service.update(
        mockService._id.toString(),
        updateServiceDto,
      );

      expect(result).toHaveProperty('name', updateServiceDto.name);
      expect(saveMock).toHaveBeenCalled();
    });

    it('should throw NotFoundException when service not found', async () => {
      serviceModel.findOne.mockResolvedValueOnce(null);
      await expect(
        service.update('invalid-id', updateServiceDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when name conflicts', async () => {
      // أول findOne: get the service by ID
      serviceModel.findOne.mockResolvedValueOnce(mockService);
      // ثاني findOne: check conflict → return another service
      serviceModel.findOne.mockResolvedValueOnce({
        ...mockService,
        _id: new Types.ObjectId(),
      });

      await expect(
        service.update(mockService._id.toString(), updateServiceDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete service successfully', async () => {
      const serviceToDelete = {
        ...mockService,
        save: jest.fn().mockResolvedValue(mockService),
      };
      serviceModel.findOne.mockResolvedValue(serviceToDelete);

      const result = await service.remove(mockService._id.toString());

      expect(result).toHaveProperty('message');
      expect(serviceToDelete.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when service not found', async () => {
      serviceModel.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findActive', () => {
    it('should return active services', async () => {
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([mockService]),
      };
      serviceModel.find = jest.fn().mockReturnValue(queryMock);

      const result = await service.findActive();

      expect(result).toEqual([mockService]);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StockTagController } from './stock-tag.controller';
import { StockTagService } from './stock-tag.service';

describe('StockTagController', () => {
  let controller: StockTagController;
  let service: jest.Mocked<StockTagService>;

  const mockStockTag = {
    _key: 'abc123',
    stockKey: 'kodak-portra-400-35mm',
    tagKey: 'color',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockTagController],
      providers: [
        {
          provide: StockTagService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findByStock: jest.fn(),
            findByTag: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StockTagController>(StockTagController);
    service = module.get(StockTagService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should return the created stock-tag association', async () => {
      service.create.mockResolvedValue(mockStockTag);

      const result = await controller.create({
        stockKey: 'kodak-portra-400-35mm',
        tagKey: 'color',
      });

      expect(service.create).toHaveBeenCalledWith({
        stockKey: 'kodak-portra-400-35mm',
        tagKey: 'color',
      });
      expect(result).toEqual(mockStockTag);
    });
  });

  describe('findAll', () => {
    it('should call findByStock when stockKey query param is provided', async () => {
      service.findByStock.mockResolvedValue([mockStockTag]);

      const result = await controller.findAll('kodak-portra-400-35mm', undefined);

      expect(service.findByStock).toHaveBeenCalledWith('kodak-portra-400-35mm');
      expect(service.findByTag).not.toHaveBeenCalled();
      expect(service.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockStockTag]);
    });

    it('should call findByTag when tagKey query param is provided', async () => {
      service.findByTag.mockResolvedValue([mockStockTag]);

      const result = await controller.findAll(undefined, 'color');

      expect(service.findByTag).toHaveBeenCalledWith('color');
      expect(service.findByStock).not.toHaveBeenCalled();
      expect(service.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockStockTag]);
    });

    it('should call findAll when no filter params are provided', async () => {
      service.findAll.mockResolvedValue([mockStockTag]);

      const result = await controller.findAll(undefined, undefined);

      expect(service.findAll).toHaveBeenCalled();
      expect(service.findByStock).not.toHaveBeenCalled();
      expect(service.findByTag).not.toHaveBeenCalled();
      expect(result).toEqual([mockStockTag]);
    });

    it('should prefer stockKey over tagKey when both are provided', async () => {
      service.findByStock.mockResolvedValue([mockStockTag]);

      await controller.findAll('kodak-portra-400-35mm', 'color');

      expect(service.findByStock).toHaveBeenCalled();
      expect(service.findByTag).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return the stock-tag when found', async () => {
      service.findOne.mockResolvedValue(mockStockTag);

      const result = await controller.findOne('abc123');

      expect(result).toEqual(mockStockTag);
    });

    it('should throw NotFoundException when not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should return a success message when deleted', async () => {
      service.remove.mockResolvedValue(true);

      const result = await controller.remove('abc123');

      expect(result).toEqual({ message: 'StockTag deleted successfully' });
    });

    it('should throw NotFoundException when not found', async () => {
      service.remove.mockResolvedValue(false);

      await expect(controller.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

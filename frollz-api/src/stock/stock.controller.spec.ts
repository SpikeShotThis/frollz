import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

describe('StockController', () => {
  let controller: StockController;
  let service: jest.Mocked<StockService>;

  const mockStock = {
    _key: 'kodak-portra-400-35mm',
    brand: 'Portra 400',
    manufacturer: 'Kodak',
    formatKey: '35mm',
    format: '35mm',
    process: 'C-41' as any,
    speed: 400,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: StockService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getBrands: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
    service = module.get(StockService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getBrands', () => {
    it('should return brands from the service', async () => {
      service.getBrands.mockResolvedValue(['Portra 400', 'Portra 800']);

      const result = await controller.getBrands('por');

      expect(service.getBrands).toHaveBeenCalledWith('por');
      expect(result).toEqual(['Portra 400', 'Portra 800']);
    });

    it('should pass empty string when q is undefined', async () => {
      service.getBrands.mockResolvedValue([]);

      await controller.getBrands(undefined as any);

      expect(service.getBrands).toHaveBeenCalledWith('');
    });

    it('should return an empty array when no brands match', async () => {
      service.getBrands.mockResolvedValue([]);

      const result = await controller.getBrands('zzz');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return the stock when found', async () => {
      service.findOne.mockResolvedValue(mockStock);

      const result = await controller.findOne('kodak-portra-400-35mm');

      expect(result).toEqual(mockStock);
    });

    it('should throw NotFoundException when stock does not exist', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should return a success message when deleted', async () => {
      service.remove.mockResolvedValue(true);

      const result = await controller.remove('kodak-portra-400-35mm');

      expect(result).toEqual({ message: 'Stock deleted successfully' });
    });

    it('should throw NotFoundException when stock does not exist', async () => {
      service.remove.mockResolvedValue(false);

      await expect(controller.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

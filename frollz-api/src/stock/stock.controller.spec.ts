import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { Process } from './entities/stock.entity';

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
            createMultipleFormats: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getBrands: jest.fn(),
            getManufacturers: jest.fn(),
            getSpeeds: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
    service = module.get(StockService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createMultipleFormats', () => {
    const dto = {
      formatKeys: ['35mm', '120'],
      process: Process.C_41,
      manufacturer: 'Kodak',
      brand: 'Portra 400',
      speed: 400,
    };

    it('should delegate to the service and return its result', async () => {
      const createdStocks = [
        { ...mockStock, _key: 'kodak-portra-400-400-35mm' },
        { ...mockStock, _key: 'kodak-portra-400-400-120', formatKey: '120' },
      ];
      service.createMultipleFormats.mockResolvedValue(createdStocks);

      const result = await controller.createMultipleFormats(dto);

      expect(service.createMultipleFormats).toHaveBeenCalledWith(dto);
      expect(result).toEqual(createdStocks);
    });
  });

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

  describe('getManufacturers', () => {
    it('should return manufacturers from the service', async () => {
      service.getManufacturers.mockResolvedValue(['Kodak', 'Konica']);

      const result = await controller.getManufacturers('ko');

      expect(service.getManufacturers).toHaveBeenCalledWith('ko');
      expect(result).toEqual(['Kodak', 'Konica']);
    });

    it('should pass empty string when q is undefined', async () => {
      service.getManufacturers.mockResolvedValue([]);

      await controller.getManufacturers(undefined as any);

      expect(service.getManufacturers).toHaveBeenCalledWith('');
    });

    it('should return an empty array when no manufacturers match', async () => {
      service.getManufacturers.mockResolvedValue([]);

      const result = await controller.getManufacturers('zzz');

      expect(result).toEqual([]);
    });
  });

  describe('getSpeeds', () => {
    it('should return speeds from the service', async () => {
      service.getSpeeds.mockResolvedValue([400, 800]);

      const result = await controller.getSpeeds('4');

      expect(service.getSpeeds).toHaveBeenCalledWith('4');
      expect(result).toEqual([400, 800]);
    });

    it('should pass empty string when q is undefined', async () => {
      service.getSpeeds.mockResolvedValue([]);

      await controller.getSpeeds(undefined as any);

      expect(service.getSpeeds).toHaveBeenCalledWith('');
    });

    it('should return an empty array when no speeds match', async () => {
      service.getSpeeds.mockResolvedValue([]);

      const result = await controller.getSpeeds('999');

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

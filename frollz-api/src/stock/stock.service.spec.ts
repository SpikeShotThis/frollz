import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { DatabaseService } from '../database/database.service';

describe('StockService', () => {
  let service: StockService;
  let databaseService: { getCollection: jest.Mock; query: jest.Mock };

  const mockCollection = {
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCursor = { all: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: DatabaseService,
          useValue: {
            getCollection: jest.fn().mockReturnValue(mockCollection),
            query: jest.fn().mockResolvedValue(mockCursor),
          },
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getBrands', () => {
    it('should query using CONTAINS on brand with the provided query', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.getBrands('por');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('CONTAINS'),
        { query: 'por' },
      );
    });

    it('should use DISTINCT to avoid duplicate brand names', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.getBrands('por');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('DISTINCT'),
        expect.anything(),
      );
    });

    it('should return matching brand names from the cursor', async () => {
      mockCursor.all.mockResolvedValue(['Portra 400', 'Portra 800']);

      const result = await service.getBrands('por');

      expect(result).toEqual(['Portra 400', 'Portra 800']);
    });

    it('should return an empty array when no brands match', async () => {
      mockCursor.all.mockResolvedValue([]);

      const result = await service.getBrands('zzz');

      expect(result).toEqual([]);
    });

    it('should pass an empty string query when called with empty string', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.getBrands('');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.any(String),
        { query: '' },
      );
    });
  });

  describe('getManufacturers', () => {
    it('should query using CONTAINS on manufacturer with the provided query', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.getManufacturers('kod');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('CONTAINS'),
        { query: 'kod' },
      );
    });

    it('should filter on the manufacturer field', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.getManufacturers('kod');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('stock.manufacturer'),
        expect.anything(),
      );
    });

    it('should use DISTINCT to avoid duplicate manufacturer names', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.getManufacturers('kod');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('DISTINCT'),
        expect.anything(),
      );
    });

    it('should return matching manufacturer names from the cursor', async () => {
      mockCursor.all.mockResolvedValue(['Kodak', 'Konica']);

      const result = await service.getManufacturers('ko');

      expect(result).toEqual(['Kodak', 'Konica']);
    });

    it('should return an empty array when no manufacturers match', async () => {
      mockCursor.all.mockResolvedValue([]);

      const result = await service.getManufacturers('zzz');

      expect(result).toEqual([]);
    });
  });
});

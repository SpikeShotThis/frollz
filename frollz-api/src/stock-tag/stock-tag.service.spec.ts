import { Test, TestingModule } from '@nestjs/testing';
import { StockTagService } from './stock-tag.service';
import { DatabaseService } from '../database/database.service';

describe('StockTagService', () => {
  let service: StockTagService;
  let databaseService: { getCollection: jest.Mock; query: jest.Mock };

  const mockCollection = {
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockCursor = { all: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTagService,
        {
          provide: DatabaseService,
          useValue: {
            getCollection: jest.fn().mockReturnValue(mockCollection),
            query: jest.fn().mockResolvedValue(mockCursor),
          },
        },
      ],
    }).compile();

    service = module.get<StockTagService>(StockTagService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should save a stock-tag with createdAt and return it with _key', async () => {
      mockCollection.save.mockResolvedValue({ _key: 'abc123' });

      const result = await service.create({
        stockKey: 'kodak-portra-400-35mm',
        tagKey: 'color',
      });

      expect(mockCollection.save).toHaveBeenCalledWith(
        expect.objectContaining({
          stockKey: 'kodak-portra-400-35mm',
          tagKey: 'color',
          createdAt: expect.any(Date),
        }),
      );
      expect(result._key).toBe('abc123');
      expect(result.stockKey).toBe('kodak-portra-400-35mm');
      expect(result.tagKey).toBe('color');
    });

    it('should not include updatedAt in the saved document', async () => {
      mockCollection.save.mockResolvedValue({ _key: 'abc123' });

      await service.create({ stockKey: 'kodak-portra-400-35mm', tagKey: 'color' });

      const savedDoc = mockCollection.save.mock.calls[0][0];
      expect(savedDoc).not.toHaveProperty('updatedAt');
    });
  });

  describe('findAll', () => {
    it('should return all stock-tag associations', async () => {
      const stockTags = [{ _key: 'abc', stockKey: 'kodak-portra-400-35mm', tagKey: 'color' }];
      mockCursor.all.mockResolvedValue(stockTags);

      const result = await service.findAll();

      expect(result).toEqual(stockTags);
    });
  });

  describe('findByStock', () => {
    it('should query filtered by stockKey', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.findByStock('kodak-portra-400-35mm');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('st.stockKey == @stockKey'),
        { stockKey: 'kodak-portra-400-35mm' },
      );
    });

    it('should return the filtered results', async () => {
      const stockTags = [{ _key: 'abc', stockKey: 'kodak-portra-400-35mm', tagKey: 'color' }];
      mockCursor.all.mockResolvedValue(stockTags);

      const result = await service.findByStock('kodak-portra-400-35mm');

      expect(result).toEqual(stockTags);
    });
  });

  describe('findByTag', () => {
    it('should query filtered by tagKey', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.findByTag('color');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('st.tagKey == @tagKey'),
        { tagKey: 'color' },
      );
    });

    it('should return the filtered results', async () => {
      const stockTags = [{ _key: 'abc', stockKey: 'kodak-portra-400-35mm', tagKey: 'color' }];
      mockCursor.all.mockResolvedValue(stockTags);

      const result = await service.findByTag('color');

      expect(result).toEqual(stockTags);
    });
  });

  describe('findOne', () => {
    it('should return the stock-tag when found', async () => {
      const st = { _key: 'abc', stockKey: 'kodak-portra-400-35mm', tagKey: 'color' };
      mockCursor.all.mockResolvedValue([st]);

      expect(await service.findOne('abc')).toEqual(st);
    });

    it('should return null when not found', async () => {
      mockCursor.all.mockResolvedValue([]);

      expect(await service.findOne('nonexistent')).toBeNull();
    });
  });

  describe('remove', () => {
    it('should return true on successful removal', async () => {
      mockCollection.remove.mockResolvedValue({});

      expect(await service.remove('abc')).toBe(true);
    });

    it('should return false when removal throws', async () => {
      mockCollection.remove.mockRejectedValue(new Error('document not found'));

      expect(await service.remove('nonexistent')).toBe(false);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { TagService } from './tag.service';
import { DatabaseService } from '../database/database.service';

describe('TagService', () => {
  let service: TagService;
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
        TagService,
        {
          provide: DatabaseService,
          useValue: {
            getCollection: jest.fn().mockReturnValue(mockCollection),
            query: jest.fn().mockResolvedValue(mockCursor),
          },
        },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should save a tag with createdAt and return it with _key', async () => {
      mockCollection.save.mockResolvedValue({ _key: 'color' });

      const result = await service.create({ value: 'color', color: '#F97316' });

      expect(mockCollection.save).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'color',
          color: '#F97316',
          createdAt: expect.any(Date),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ _key: 'color', value: 'color', color: '#F97316' }),
      );
    });

    it('should not include updatedAt in the saved document', async () => {
      mockCollection.save.mockResolvedValue({ _key: 'portrait' });

      await service.create({ value: 'portrait', color: '#EC4899' });

      const savedDoc = mockCollection.save.mock.calls[0][0];
      expect(savedDoc).not.toHaveProperty('updatedAt');
    });
  });

  describe('findAll', () => {
    it('should return all tags from the cursor', async () => {
      const tags = [
        { _key: 'color', value: 'color', color: '#F97316' },
        { _key: 'portrait', value: 'portrait', color: '#EC4899' },
      ];
      mockCursor.all.mockResolvedValue(tags);

      const result = await service.findAll();

      expect(result).toEqual(tags);
    });

    it('should query with SORT tag.value ASC', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.findAll();

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('SORT tag.value ASC'),
      );
    });
  });

  describe('findOne', () => {
    it('should return the tag when found', async () => {
      const tag = { _key: 'color', value: 'color', color: '#F97316' };
      mockCursor.all.mockResolvedValue([tag]);

      const result = await service.findOne('color');

      expect(result).toEqual(tag);
    });

    it('should return null when not found', async () => {
      mockCursor.all.mockResolvedValue([]);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });

    it('should filter by the provided key', async () => {
      mockCursor.all.mockResolvedValue([]);

      await service.findOne('color');

      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('tag._key == @key'),
        { key: 'color' },
      );
    });
  });

  describe('update', () => {
    it('should update and return the refreshed tag', async () => {
      const updated = { _key: 'color', value: 'color', color: '#FFFFFF' };
      mockCollection.update.mockResolvedValue({});
      mockCursor.all.mockResolvedValue([updated]);

      const result = await service.update('color', { color: '#FFFFFF' });

      expect(mockCollection.update).toHaveBeenCalledWith('color', { color: '#FFFFFF' });
      expect(result).toEqual(updated);
    });

    it('should return null when update throws', async () => {
      mockCollection.update.mockRejectedValue(new Error('document not found'));

      const result = await service.update('nonexistent', { color: '#FFFFFF' });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should return true on successful removal', async () => {
      mockCollection.remove.mockResolvedValue({});

      expect(await service.remove('color')).toBe(true);
    });

    it('should return false when removal throws', async () => {
      mockCollection.remove.mockRejectedValue(new Error('document not found'));

      expect(await service.remove('nonexistent')).toBe(false);
    });
  });
});

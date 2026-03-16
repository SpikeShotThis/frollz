import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';

describe('TagController', () => {
  let controller: TagController;
  let service: jest.Mocked<TagService>;

  const mockTag = { _key: 'color', value: 'color', color: '#F97316' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [
        {
          provide: TagService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TagController>(TagController);
    service = module.get(TagService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should return the created tag', async () => {
      service.create.mockResolvedValue(mockTag);

      const result = await controller.create({ value: 'color', color: '#F97316' });

      expect(service.create).toHaveBeenCalledWith({ value: 'color', color: '#F97316' });
      expect(result).toEqual(mockTag);
    });
  });

  describe('findAll', () => {
    it('should return all tags', async () => {
      service.findAll.mockResolvedValue([mockTag]);

      const result = await controller.findAll();

      expect(result).toEqual([mockTag]);
    });
  });

  describe('findOne', () => {
    it('should return the tag when found', async () => {
      service.findOne.mockResolvedValue(mockTag);

      const result = await controller.findOne('color');

      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException when not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should return the updated tag', async () => {
      const updated = { ...mockTag, color: '#FFFFFF' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update('color', { color: '#FFFFFF' });

      expect(service.update).toHaveBeenCalledWith('color', { color: '#FFFFFF' });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      service.update.mockResolvedValue(null);

      await expect(controller.update('nonexistent', { color: '#FFFFFF' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should return a success message when deleted', async () => {
      service.remove.mockResolvedValue(true);

      const result = await controller.remove('color');

      expect(result).toEqual({ message: 'Tag deleted successfully' });
    });

    it('should throw NotFoundException when tag does not exist', async () => {
      service.remove.mockResolvedValue(false);

      await expect(controller.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

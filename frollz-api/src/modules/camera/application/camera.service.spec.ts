import { NotFoundException } from '@nestjs/common';
import { CameraService } from './camera.service';
import { ICameraRepository } from '../../../domain/camera/repositories/camera.repository.interface';
import { CreateCameraDto } from '../dto/CreateCameraDto';
import { UpdateCameraDto } from '../dto/UpdateCameraDto';
import { FilterCameraDto } from '../dto/FilterCameraDto';
import { Camera } from '../../../domain/camera/entities/camera.entity';
import { INoteRepository } from '../../../domain/shared/repositories/note.repository.interface';

describe('CameraService', () => {
  let service: CameraService;
  let mockCameraRepo: jest.Mocked<ICameraRepository>;
  let mockNoteRepo: jest.Mocked<INoteRepository>;

  const makeMockNoteRepo = (): jest.Mocked<INoteRepository> => ({
    findById: jest.fn(),
    findAll: jest.fn(),
    findByEntityId: jest.fn(),
    save: jest.fn(),
  })

  const makeMockCameraRepo = (): jest.Mocked<ICameraRepository> => ({
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));

    service = new CameraService(
      mockCameraRepo = makeMockCameraRepo(),
      mockNoteRepo = makeMockNoteRepo(),
    )
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of cameras', async () => {
      const filter: FilterCameraDto = {};
      const cameras: Camera[] = [Camera.create({ brand: 'Canon', model: 'EOS R', status: 'active' })];
      mockCameraRepo.findAll.mockResolvedValue(cameras);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.findAll(filter);

      expect(mockCameraRepo.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(cameras);
    });
  });

  describe('delete', () => {
    it('should delete a camera by id', async () => {
      const id = 1;
      mockCameraRepo.delete.mockResolvedValue(undefined);

      await service.delete(id);

      expect(mockCameraRepo.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update and return the camera', async () => {
      const id = 1;
      const dto: UpdateCameraDto = { brand: 'Nikon', model: 'D5', status: 'active' };
      const existing = Camera.create({ id, brand: 'Canon', model: 'EOS R', status: 'active' });
      const updated = Camera.create({ id, brand: 'Nikon', model: 'D5', status: 'active' });
      mockCameraRepo.findById.mockResolvedValue(existing);
      mockCameraRepo.update.mockResolvedValue(undefined);
      mockCameraRepo.findById.mockResolvedValue(updated);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.update(id, dto);

      expect(mockCameraRepo.findById).toHaveBeenCalledWith(id);
      expect(mockCameraRepo.update).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException if camera not found', async () => {
      const id = 1;
      const dto: UpdateCameraDto = { brand: 'Nikon', model: 'D5', status: 'active' };
      mockCameraRepo.findById.mockResolvedValue(null);

      await expect(service.update(id, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return the camera', async () => {
      const dto: CreateCameraDto = { brand: 'Canon', model: 'EOS R', status: 'active', notes: 'Great camera', supported_format_ids: [1, 2] };
      const cameraId = 1;
      const camera = Camera.create({ id: cameraId, brand: 'Canon', model: 'EOS R', status: 'active' });
      mockCameraRepo.save.mockResolvedValue(cameraId);
      mockCameraRepo.findById.mockResolvedValue(camera);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.create(dto);

      expect(mockCameraRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ brand: dto.brand, model: dto.model, status: dto.status, notes: dto.notes }),
        dto.supported_format_ids ?? [],
      );
      expect(mockNoteRepo.save).toHaveBeenCalledWith(expect.objectContaining({ text: dto.notes, entity_type: 'camera', entity_id: cameraId }));
      expect(mockCameraRepo.findById).toHaveBeenCalledWith(cameraId);
      expect(result).toEqual(camera);
    });
  });

  describe('findById', () => {
    it('should return the camera if found', async () => {
      const id = 1;
      const camera = Camera.create({ id, brand: 'Canon', model: 'EOS R', status: 'active' });
      mockCameraRepo.findById.mockResolvedValue(camera);
      mockNoteRepo.findByEntityId.mockResolvedValue([]);

      const result = await service.findById(id);

      expect(mockCameraRepo.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(camera);
    });

    it('should throw NotFoundException if camera not found', async () => {
      const id = 1;
      mockCameraRepo.findById.mockResolvedValue(null);

      await expect(service.findById(id)).rejects.toThrow(NotFoundException);
    });
  });
});
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CAMERA_REPOSITORY, ICameraRepository } from '../../../domain/camera/repositories/camera.repository.interface';
import { CreateCameraDto } from '../dto/CreateCameraDto';
import { UpdateCameraDto } from '../dto/UpdateCameraDto';
import { FilterCameraDto } from '../dto/FilterCameraDto';
import { Camera } from '../../../domain/camera/entities/camera.entity';
import { INoteRepository, NOTE_REPOSITORY } from '../../../domain/shared/repositories/note.repository.interface';
import { Note } from '../../../domain/shared/entities/note.entity';

@Injectable()
export class CameraService {
  constructor(
    @Inject(CAMERA_REPOSITORY) private readonly cameraRepo: ICameraRepository,
    @Inject(NOTE_REPOSITORY) private readonly noteRepository: INoteRepository,
  ) { }

  async findAll(filter: FilterCameraDto): Promise<Camera[]> {
    const cameras = await this.cameraRepo.findAll({ ...filter });
    const results = await Promise.all(cameras.map(async (c) => {
      const notes = await this.noteRepository.findByEntityId(c.id);
      if (notes.length > 0) {
        return Camera.create({ ...c, notes: notes[0].text });
      }
      return c;
    }));

    return results;
  }
  async delete(id: number): Promise<void> {
    return this.cameraRepo.delete(id);
  }

  async update(id: number, dto: UpdateCameraDto) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Camera with ID ${id} not found`);
    }
    const updated = Camera.create({
      id: existing.id,
      brand: dto.brand ?? existing.brand,
      model: dto.model ?? existing.model,
      status: dto.status ?? existing.status,
      serialNumber: dto.serial_number ?? existing.serialNumber,
      purchasePrice: dto.purchase_price ?? existing.purchasePrice,
      acquiredAt: dto.acquired_at ?? existing.acquiredAt,
    });
    await this.cameraRepo.update(updated)
    if (dto.notes) {
      await this.addNote(id, dto.notes, new Date());
    }
    return this.findById(id);
  }

  async create(dto: CreateCameraDto): Promise<Camera> {
    const cameraId = await this.cameraRepo.save(
      Camera.create({
        brand: dto.brand,
        model: dto.model,
        status: dto.status,
        notes: dto.notes,
        serialNumber: dto.serial_number,
        purchasePrice: dto.purchase_price,
        acquiredAt: dto.acquired_at ? new Date(dto.acquired_at) : undefined,
      }), dto.supported_format_ids ?? []
    );

    if (dto.notes) {
      await this.addNote(cameraId, dto.notes, new Date());
    }
    return this.findById(cameraId);

  }
  async findById(id: number): Promise<Camera> {
    const camera = await this.cameraRepo.findById(id);
    if (!camera) {
      throw new NotFoundException(`Camera with ID ${id} not found`);
    }
    const [notes] = await this.noteRepository.findByEntityId(id);
    if (notes) {
      return Camera.create({ ...camera, notes: notes.text });
    }

    return camera;
  }

  private async addNote(entityId: number, text: string, createdAt: Date): Promise<void> {
    await this.noteRepository.save(Note.create({
      entity_id: entityId,
      entity_type: 'camera',
      text: text,
      created_at: createdAt,
    }));
  }


}

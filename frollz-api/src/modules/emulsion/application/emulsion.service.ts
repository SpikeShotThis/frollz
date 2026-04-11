import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { Emulsion } from '../../../domain/emulsion/entities/emulsion.entity';
import { IEmulsionRepository, EMULSION_REPOSITORY } from '../../../domain/emulsion/repositories/emulsion.repository.interface';
import { IEmulsionTagRepository, EMULSION_TAG_REPOSITORY } from '../../../domain/emulsion-tag/repositories/emulsion-tag.repository.interface';
import { CreateEmulsionDto } from '../dto/create-emulsion.dto';
import { CreateEmulsionMultipleFormatsDto } from '../dto/create-emulsion-multiple-formats.dto';
import { UpdateEmulsionDto } from '../dto/update-emulsion.dto';

@Injectable()
export class EmulsionService {
  constructor(
    @Inject(EMULSION_REPOSITORY) private readonly emulsionRepo: IEmulsionRepository,
    @Inject(EMULSION_TAG_REPOSITORY) private readonly emulsionTagRepo: IEmulsionTagRepository,
  ) {}

  findAll(): Promise<Emulsion[]> {
    return this.emulsionRepo.findAll();
  }

  async findById(id: number): Promise<Emulsion> {
    const emulsion = await this.emulsionRepo.findById(id);
    if (!emulsion) throw new NotFoundException(`Emulsion '${id}' not found`);
    return emulsion;
  }

  async create(dto: CreateEmulsionDto): Promise<Emulsion> {
    const emulsion = Emulsion.create({ id: randomInt(1, 1000000), ...dto, parentId: dto.parentId ?? null });
    await this.emulsionRepo.save(emulsion);
    return emulsion;
  }

  async createMultipleFormats(dto: CreateEmulsionMultipleFormatsDto): Promise<Emulsion[]> {
    const emulsions = dto.formatIds.map((formatId) =>
      Emulsion.create({
        id: randomInt(1, 1000000),
        name: dto.name,
        brand: dto.brand,
        manufacturer: dto.manufacturer,
        speed: dto.speed,
        processId: dto.processId,
        formatId,
        parentId: dto.parentId ?? null,
      }),
    );
    await Promise.all(emulsions.map((e) => this.emulsionRepo.save(e)));
    return emulsions;
  }

  async update(id: number, dto: UpdateEmulsionDto): Promise<Emulsion> {
    const existing = await this.findById(id);
    const updated = Emulsion.create({
      id: existing.id,
      name: dto.name ?? existing.name,
      brand: dto.brand ?? existing.brand,
      manufacturer: dto.manufacturer ?? existing.manufacturer,
      speed: dto.speed ?? existing.speed,
      processId: dto.processId ?? existing.processId,
      formatId: dto.formatId ?? existing.formatId,
      parentId: dto.parentId !== undefined ? dto.parentId : existing.parentId,
    });
    await this.emulsionRepo.update(updated);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.emulsionRepo.delete(id);
  }

  async addTag(emulsionId: number, tagId: number): Promise<void> {
    await this.findById(emulsionId);
    await this.emulsionTagRepo.add(emulsionId, tagId);
  }

  async removeTag(emulsionId: number, tagId: number): Promise<void> {
    await this.findById(emulsionId);
    await this.emulsionTagRepo.remove(emulsionId, tagId);
  }

  findBrands(q?: string): Promise<string[]> {
    return this.emulsionRepo.findBrands(q);
  }

  findManufacturers(q?: string): Promise<string[]> {
    return this.emulsionRepo.findManufacturers(q);
  }

  findSpeeds(q?: string): Promise<number[]> {
    return this.emulsionRepo.findSpeeds(q);
  }
}

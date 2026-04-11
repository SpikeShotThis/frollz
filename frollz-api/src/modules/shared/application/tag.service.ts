import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Tag } from '../../../domain/shared/entities/tag.entity';
import { ITagRepository, TAG_REPOSITORY } from '../../../domain/shared/repositories/tag.repository.interface';
import { randomInt } from 'crypto';

@Injectable()
export class TagService {
  constructor(@Inject(TAG_REPOSITORY) private readonly tagRepo: ITagRepository) {}

  findAll(): Promise<Tag[]> {
    return this.tagRepo.findAll();
  }

  async findById(id: number): Promise<Tag> {
    const tag = await this.tagRepo.findById(id);
    if (!tag) throw new NotFoundException(`Tag '${id}' not found`);
    return tag;
  }

  async create(data: { name: string; colorCode: string; description?: string }): Promise<Tag> {
    const tag = Tag.create({id: randomInt(1,281474976710654),name: data.name, colorCode: data.colorCode, description: data.description });
    await this.tagRepo.save(tag);
    return tag;
  }

  async update(id: number, data: { name?: string; colorCode?: string; description?: string }): Promise<Tag> {
    const existing = await this.findById(id);
    const updated = Tag.create({
      id: existing.id,
      name: data.name ?? existing.name,
      colorCode: data.colorCode ?? existing.colorCode,
      description: data.description !== undefined ? data.description : existing.description,
    });
    await this.tagRepo.update(updated);
    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.findById(id);
    await this.tagRepo.delete(id);
  }
}

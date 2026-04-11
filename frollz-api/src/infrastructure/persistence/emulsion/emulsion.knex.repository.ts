import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Emulsion } from '../../../domain/emulsion/entities/emulsion.entity';
import { IEmulsionRepository } from '../../../domain/emulsion/repositories/emulsion.repository.interface';
import { Tag } from '../../../domain/shared/entities/tag.entity';
import { KNEX_CONNECTION } from '../knex.provider';
import { EmulsionRow, EmulsionTagRow, TagRow } from '../types/db.types';
import { EmulsionMapper } from './emulsion.mapper';

@Injectable()
export class EmulsionKnexRepository implements IEmulsionRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<Emulsion | null> {
    const row = await this.knex<EmulsionRow>('emulsion').where({ id }).first();
    if (!row) return null;
    const emulsion = EmulsionMapper.toDomain(row);
    const tags = await this.loadTags(id);
    return Emulsion.create({ ...emulsion, tags });
  }

  async findAll(): Promise<Emulsion[]> {
    const rows = await this.knex<EmulsionRow>('emulsion').select('*');
    return Promise.all(
      rows.map(async (row) => {
        const emulsion = EmulsionMapper.toDomain(row);
        const tags = await this.loadTags(row.id);
        return Emulsion.create({ ...emulsion, tags });
      }),
    );
  }

  async findByProcessId(processId: number): Promise<Emulsion[]> {
    const rows = await this.knex<EmulsionRow>('emulsion').where({ process_id: processId });
    return Promise.all(
      rows.map(async (row) => {
        const emulsion = EmulsionMapper.toDomain(row);
        const tags = await this.loadTags(row.id);
        return Emulsion.create({ ...emulsion, tags });
      }),
    );
  }

  async findByFormatId(formatId: number): Promise<Emulsion[]> {
    const rows = await this.knex<EmulsionRow>('emulsion').where({ format_id: formatId });
    return Promise.all(
      rows.map(async (row) => {
        const emulsion = EmulsionMapper.toDomain(row);
        const tags = await this.loadTags(row.id);
        return Emulsion.create({ ...emulsion, tags });
      }),
    );
  }

  async findBrands(q?: string): Promise<string[]> {
    const query = this.knex<EmulsionRow>('emulsion').distinct('brand').orderBy('brand');
    if (q) query.whereILike('brand', `%${q}%`);
    const rows = await query;
    return rows.map((r) => r.brand);
  }

  async findManufacturers(q?: string): Promise<string[]> {
    const query = this.knex<EmulsionRow>('emulsion').distinct('manufacturer').orderBy('manufacturer');
    if (q) query.whereILike('manufacturer', `%${q}%`);
    const rows = await query;
    return rows.map((r) => r.manufacturer);
  }

  async findSpeeds(q?: string): Promise<number[]> {
    const query = this.knex<EmulsionRow>('emulsion').distinct('speed').orderBy('speed');
    if (q) query.where('speed', 'like', `%${q}%`);
    const rows = await query;
    return rows.map((r) => r.speed);
  }

  async save(emulsion: Emulsion): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = EmulsionMapper.toPersistence(emulsion);
    const [generatedId] = await this.knex('emulsion').insert(data);
    return generatedId;
  }

  async update(emulsion: Emulsion): Promise<void> {
    const { id, ...data } = EmulsionMapper.toPersistence(emulsion);
    await this.knex('emulsion').where({ id }).update(data);
  }

  async delete(id: number): Promise<void> {
    await this.knex('emulsion').where({ id }).delete();
  }

  private async loadTags(emulsionId: number): Promise<Tag[]> {
    const rows = await this.knex<TagRow>('tag')
      .join<EmulsionTagRow>('emulsion_tag', 'tag.id', 'emulsion_tag.tag_id')
      .where('emulsion_tag.emulsion_id', emulsionId)
      .select('tag.*');
    return rows.map((r) =>
      Tag.create({
        id: r.id,
        name: r.name,
        colorCode: r.color_code,
        description: r.description,
      }),
    );
  }
}

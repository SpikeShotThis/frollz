import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Emulsion } from '../../../domain/emulsion/entities/emulsion.entity';
import { IEmulsionRepository } from '../../../domain/emulsion/repositories/emulsion.repository.interface';
import { Tag } from '../../../domain/shared/entities/tag.entity';
import { KNEX_CONNECTION } from '../knex.provider';
import { EmulsionRow, EmulsionTagRow, TagRow } from '../types/db.types';
import { EmulsionMapper } from './emulsion.mapper';

// Columns returned for list/detail queries — excludes the blob to keep payloads lean.
const EMULSION_COLUMNS: (keyof EmulsionRow)[] = [
  'id',
  'parent_id',
  'process_id',
  'format_id',
  'name',
  'brand',
  'manufacturer',
  'speed',
  'box_image_mime_type',
];

@Injectable()
export class EmulsionKnexRepository implements IEmulsionRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<Emulsion | null> {
    const row = await this.knex<EmulsionRow>('emulsion').select(EMULSION_COLUMNS).where({ id }).first();
    if (!row) return null;
    const emulsion = EmulsionMapper.toDomain(row);
    const tags = await this.loadTags(id);
    return Emulsion.create({ ...emulsion, tags });
  }

  async findAll(): Promise<Emulsion[]> {
    const rows = await this.knex<EmulsionRow>('emulsion').select(EMULSION_COLUMNS);
    return Promise.all(
      rows.map(async (row) => {
        const emulsion = EmulsionMapper.toDomain(row);
        const tags = await this.loadTags(row.id);
        return Emulsion.create({ ...emulsion, tags });
      }),
    );
  }

  async findByProcessId(processId: number): Promise<Emulsion[]> {
    const rows = await this.knex<EmulsionRow>('emulsion').select(EMULSION_COLUMNS).where({ process_id: processId });
    return Promise.all(
      rows.map(async (row) => {
        const emulsion = EmulsionMapper.toDomain(row);
        const tags = await this.loadTags(row.id);
        return Emulsion.create({ ...emulsion, tags });
      }),
    );
  }

  async findByFormatId(formatId: number): Promise<Emulsion[]> {
    const rows = await this.knex<EmulsionRow>('emulsion').select(EMULSION_COLUMNS).where({ format_id: formatId });
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

  async updateBoxImage(id: number, data: Buffer, mimeType: string): Promise<void> {
    await this.knex('emulsion')
      .where({ id })
      .update({ box_image_data: data, box_image_mime_type: mimeType });
  }

  async getBoxImage(id: number): Promise<{ data: Buffer; mimeType: string } | null> {
    const row = await this.knex<EmulsionRow>('emulsion')
      .select(['box_image_data', 'box_image_mime_type'])
      .where({ id })
      .first();
    if (!row?.box_image_data || !row.box_image_mime_type) return null;
    return { data: row.box_image_data, mimeType: row.box_image_mime_type };
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

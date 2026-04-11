import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Tag } from '../../../domain/shared/entities/tag.entity';
import { ITagRepository } from '../../../domain/shared/repositories/tag.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { TagRow } from '../types/db.types';

@Injectable()
export class TagKnexRepository implements ITagRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<Tag | null> {
    const row = await this.knex<TagRow>('tag').where({ id }).first();
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Tag[]> {
    const rows = await this.knex<TagRow>('tag').select('*').orderBy('name');
    return rows.map(this.toDomain);
  }

  async findByName(name: string): Promise<Tag | null> {
    const row = await this.knex<TagRow>('tag').where({ name }).first();
    return row ? this.toDomain(row) : null;
  }

  async save(tag: Tag): Promise<number> {
    const [generatedId] = await this.knex('tag').insert({
      name: tag.name,
      color_code: tag.colorCode,
      description: tag.description,
    });
    return generatedId;
  }

  async update(tag: Tag): Promise<void> {
    await this.knex('tag').where({ id: tag.id }).update({
      name: tag.name,
      color_code: tag.colorCode,
      description: tag.description,
    });
  }

  async delete(id: number): Promise<void> {
    await this.knex('tag').where({ id }).delete();
  }

  private toDomain(row: TagRow): Tag {
    return Tag.create({
      id: row.id,
      name: row.name,
      colorCode: row.color_code,
      description: row.description,
    });
  }
}

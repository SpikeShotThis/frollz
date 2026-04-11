import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Format } from '../../../domain/shared/entities/format.entity';
import { IFormatRepository } from '../../../domain/shared/repositories/format.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { FormatRow } from '../types/db.types';

@Injectable()
export class FormatKnexRepository implements IFormatRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: string): Promise<Format | null> {
    const row = await this.knex<FormatRow>('format').where({ id }).first();
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Format[]> {
    const rows = await this.knex<FormatRow>('format').select('*').orderBy('name');
    return rows.map(this.toDomain);
  }

  async findByPackageId(packageId: string): Promise<Format[]> {
    const rows = await this.knex<FormatRow>('format').where({ package_id: packageId }).orderBy('name');
    return rows.map(this.toDomain);
  }

  async save(format: Format): Promise<void> {
    await this.knex('format').insert({
      id: format.id,
      package_id: format.packageId,
      name: format.name,
    });
  }

  async update(format: Format): Promise<void> {
    await this.knex('format').where({ id: format.id }).update({
      package_id: format.packageId,
      name: format.name,
    });
  }

  async delete(id: string): Promise<void> {
    await this.knex('format').where({ id }).delete();
  }

  private toDomain(row: FormatRow): Format {
    return Format.create({
      id: row.id.trim(),
      packageId: row.package_id.trim(),
      name: row.name,
    });
  }
}

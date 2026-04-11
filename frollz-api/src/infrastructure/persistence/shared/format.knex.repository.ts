import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Format } from '../../../domain/shared/entities/format.entity';
import { IFormatRepository } from '../../../domain/shared/repositories/format.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { FormatRow } from '../types/db.types';

@Injectable()
export class FormatKnexRepository implements IFormatRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<Format | null> {
    const row = await this.knex<FormatRow>('format').where({ id }).first();
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Format[]> {
    const rows = await this.knex<FormatRow>('format').select('*').orderBy('name');
    return rows.map((r) => this.toDomain(r));
  }

  async findByPackageId(packageId: number): Promise<Format[]> {
    const rows = await this.knex<FormatRow>('format').where({ package_id: packageId }).orderBy('name');
    return rows.map((r) => this.toDomain(r));
  }

  async save(format: Format): Promise<number> {
    const [generatedId] = await this.knex('format').insert({
      package_id: format.packageId,
      name: format.name,
    });
    return generatedId;
  }

  async update(format: Format): Promise<void> {
    await this.knex('format').where({ id: format.id }).update({
      package_id: format.packageId,
      name: format.name,
    });
  }

  async delete(id: number): Promise<void> {
    await this.knex('format').where({ id }).delete();
  }

  private toDomain(row: FormatRow): Format {
    return Format.create({
      id: row.id,
      packageId: row.package_id,
      name: row.name,
    });
  }
}

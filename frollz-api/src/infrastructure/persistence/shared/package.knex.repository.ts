import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Package } from '../../../domain/shared/entities/package.entity';
import { IPackageRepository } from '../../../domain/shared/repositories/package.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { PackageRow } from '../types/db.types';

@Injectable()
export class PackageKnexRepository implements IPackageRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<Package | null> {
    const row = await this.knex<PackageRow>('package').where({ id }).first();
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Package[]> {
    const rows = await this.knex<PackageRow>('package').select('*').orderBy('name');
    return rows.map(this.toDomain);
  }

  async findByName(name: string): Promise<Package | null> {
    const row = await this.knex<PackageRow>('package').where({ name }).first();
    return row ? this.toDomain(row) : null;
  }

  async save(pkg: Package): Promise<void> {
    await this.knex('package').insert({ id: pkg.id, name: pkg.name });
  }

  async update(pkg: Package): Promise<void> {
    await this.knex('package').where({ id: pkg.id }).update({ name: pkg.name });
  }

  async delete(id: number): Promise<void> {
    await this.knex('package').where({ id }).delete();
  }

  private toDomain(row: PackageRow): Package {
    return Package.create({ id: row.id.trim(), name: row.name });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Process } from '../../../domain/shared/entities/process.entity';
import { IProcessRepository } from '../../../domain/shared/repositories/process.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { ProcessRow } from '../types/db.types';

@Injectable()
export class ProcessKnexRepository implements IProcessRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: string): Promise<Process | null> {
    const row = await this.knex<ProcessRow>('process').where({ id }).first();
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Process[]> {
    const rows = await this.knex<ProcessRow>('process').select('*').orderBy('name');
    return rows.map(this.toDomain);
  }

  async findByName(name: string): Promise<Process | null> {
    const row = await this.knex<ProcessRow>('process').where({ name }).first();
    return row ? this.toDomain(row) : null;
  }

  async save(process: Process): Promise<void> {
    await this.knex('process').insert({ id: process.id, name: process.name });
  }

  async update(process: Process): Promise<void> {
    await this.knex('process').where({ id: process.id }).update({ name: process.name });
  }

  async delete(id: string): Promise<void> {
    await this.knex('process').where({ id }).delete();
  }

  private toDomain(row: ProcessRow): Process {
    return Process.create({ id: row.id.trim(), name: row.name });
  }
}

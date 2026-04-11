import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TransitionMetadataField } from '../../../domain/transition/entities/transition-metadata-field.entity';
import { ITransitionMetadataFieldRepository } from '../../../domain/transition/repositories/transition-metadata-field.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { TransitionMetadataFieldRow } from '../types/db.types';

@Injectable()
export class TransitionMetadataFieldKnexRepository implements ITransitionMetadataFieldRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<TransitionMetadataField | null> {
    const row = await this.knex<TransitionMetadataFieldRow>('transition_metadata_field').where({ id }).first();
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<TransitionMetadataField[]> {
    const rows = await this.knex<TransitionMetadataFieldRow>('transition_metadata_field').select('*').orderBy('name');
    return rows.map(this.toDomain);
  }

  async findByName(name: string): Promise<TransitionMetadataField | null> {
    const row = await this.knex<TransitionMetadataFieldRow>('transition_metadata_field').where({ name }).first();
    return row ? this.toDomain(row) : null;
  }

  async save(field: TransitionMetadataField): Promise<void> {
    await this.knex('transition_metadata_field').insert({
      id: field.id,
      name: field.name,
      field_type: field.fieldType,
    });
  }

  async update(field: TransitionMetadataField): Promise<void> {
    await this.knex('transition_metadata_field').where({ id: field.id }).update({
      name: field.name,
      field_type: field.fieldType,
    });
  }

  async delete(id: number): Promise<void> {
    await this.knex('transition_metadata_field').where({ id }).delete();
  }

  private toDomain(row: TransitionMetadataFieldRow): TransitionMetadataField {
    return TransitionMetadataField.create({
      id: row.id,
      name: row.name,
      fieldType: row.field_type,
    });
  }
}

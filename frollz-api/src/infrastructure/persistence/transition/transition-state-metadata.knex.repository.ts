import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TransitionStateMetadata } from '../../../domain/transition/entities/transition-state-metadata.entity';
import { ITransitionStateMetadataRepository } from '../../../domain/transition/repositories/transition-state-metadata.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { TransitionStateMetadataRow } from '../types/db.types';

@Injectable()
export class TransitionStateMetadataKnexRepository implements ITransitionStateMetadataRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<TransitionStateMetadata | null> {
    const row = await this.knex<TransitionStateMetadataRow>('transition_state_metadata').where({ id }).first();
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<TransitionStateMetadata[]> {
    const rows = await this.knex<TransitionStateMetadataRow>('transition_state_metadata').select('*');
    return rows.map(this.toDomain);
  }

  async findBytransitionStateId(transitionStateId: number): Promise<TransitionStateMetadata[]> {
    const rows = await this.knex<TransitionStateMetadataRow>('transition_state_metadata').where({
      transition_state_id: transitionStateId,
    });
    return rows.map(this.toDomain);
  }

  async save(metadata: TransitionStateMetadata): Promise<void> {
    await this.knex('transition_state_metadata').insert({
      id: metadata.id,
      field_id: metadata.fieldId,
      transition_state_id: metadata.transitionStateId,
      default_value: metadata.defaultValue,
    });
  }

  async update(metadata: TransitionStateMetadata): Promise<void> {
    await this.knex('transition_state_metadata').where({ id: metadata.id }).update({
      field_id: metadata.fieldId,
      transition_state_id: metadata.transitionStateId,
      default_value: metadata.defaultValue,
    });
  }

  async delete(id: number): Promise<void> {
    await this.knex('transition_state_metadata').where({ id }).delete();
  }

  private toDomain(row: TransitionStateMetadataRow): TransitionStateMetadata {
    return TransitionStateMetadata.create({
      id: row.id,
      fieldId: row.field_id,
      transitionStateId: row.transition_state_id,
      defaultValue: row.default_value,
    });
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TransitionState } from '../../../domain/transition/entities/transition-state.entity';
import { TransitionStateMetadata } from '../../../domain/transition/entities/transition-state-metadata.entity';
import { ITransitionStateRepository } from '../../../domain/transition/repositories/transition-state.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { TransitionStateRow, TransitionStateMetadataRow } from '../types/db.types';

@Injectable()
export class TransitionStateKnexRepository implements ITransitionStateRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<TransitionState | null> {
    const row = await this.knex<TransitionStateRow>('transition_state').where({ id }).first();
    if (!row) return null;
    const metadata = await this.loadMetadata(id);
    return TransitionState.create({ id: row.id.trim(), name: row.name, metadata });
  }

  async findAll(): Promise<TransitionState[]> {
    const rows = await this.knex<TransitionStateRow>('transition_state').select('*').orderBy('name');
    return Promise.all(
      rows.map(async (row) => {
        const metadata = await this.loadMetadata(row.id.trim());
        return TransitionState.create({ id: row.id.trim(), name: row.name, metadata });
      }),
    );
  }

  async findByName(name: string): Promise<TransitionState | null> {
    const row = await this.knex<TransitionStateRow>('transition_state').where({ name }).first();
    if (!row) return null;
    const metadata = await this.loadMetadata(row.id.trim());
    return TransitionState.create({ id: row.id.trim(), name: row.name, metadata });
  }

  async save(state: TransitionState): Promise<void> {
    await this.knex('transition_state').insert({ id: state.id, name: state.name });
  }

  async update(state: TransitionState): Promise<void> {
    await this.knex('transition_state').where({ id: state.id }).update({ name: state.name });
  }

  async delete(id: number): Promise<void> {
    await this.knex('transition_state').where({ id }).delete();
  }

  private async loadMetadata(transitionStateId: number): Promise<TransitionStateMetadata[]> {
    const rows = await this.knex<TransitionStateMetadataRow>('transition_state_metadata').where({
      transition_state_id: transitionStateId,
    });
    return rows.map((r) =>
      TransitionStateMetadata.create({
        id: r.id.trim(),
        fieldId: r.field_id.trim(),
        transitionStateId: r.transition_state_id.trim(),
        defaultValue: r.default_value,
      }),
    );
  }
}

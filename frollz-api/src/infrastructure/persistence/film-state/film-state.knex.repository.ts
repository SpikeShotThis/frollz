import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { FilmStateMetadata } from '../../../domain/film-state/entities/film-state-metadata.entity';
import { IFilmStateRepository } from '../../../domain/film-state/repositories/film-state.repository.interface';
import { TransitionStateMetadata } from '../../../domain/transition/entities/transition-state-metadata.entity';
import { TransitionMetadataField } from '../../../domain/transition/entities/transition-metadata-field.entity';
import { KNEX_CONNECTION } from '../knex.provider';
import { FilmStateRow } from '../types/db.types';
import { FilmStateMapper } from './film-state.mapper';

interface MetadataJoinRow {
  fsm_id: number;
  film_state_id: number;
  transition_state_metadata_id: number;
  fsm_value: string | null;
  tsm_id: number;
  field_id: number;
  transition_state_id: number;
  default_value: string | null;
  tmf_id: number;
  field_name: string;
  field_type: string;
  allow_multiple: boolean;
}

@Injectable()
export class FilmStateKnexRepository implements IFilmStateRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<FilmState | null> {
    const row = await this.knex<FilmStateRow>('film_state').where({ id }).first();
    if (!row) return null;
    const filmState = FilmStateMapper.toDomain(row);
    const metadata = await this.loadMetadata(id);
    return FilmState.create({ ...filmState, metadata });
  }

  async findByFilmId(filmId: number): Promise<FilmState[]> {
    const rows = await this.knex<FilmStateRow>('film_state')
      .where({ film_id: filmId })
      .orderBy([{ column: 'date', order: 'desc' }, { column: 'id', order: 'desc' }]);
    return Promise.all(
      rows.map(async (row) => {
        const filmState = FilmStateMapper.toDomain(row);
        const metadata = await this.loadMetadata(row.id);
        return FilmState.create({ ...filmState, metadata });
      }),
    );
  }

  async findLatestByFilmId(filmId: number): Promise<FilmState | null> {
    const row = await this.knex<FilmStateRow>('film_state')
      .where({ film_id: filmId })
      .orderBy([{ column: 'date', order: 'desc' }, { column: 'id', order: 'desc' }])
      .first();
    if (!row) return null;
    const filmState = FilmStateMapper.toDomain(row);
    const metadata = await this.loadMetadata(row.id);
    return FilmState.create({ ...filmState, metadata });
  }

  async findFilmIdsByCurrentState(stateIds: number[]): Promise<number[]> {
    const rows = await this.knex<FilmStateRow>('film_state as fs')
      .whereIn('fs.state_id', stateIds)
      .whereRaw(
        'fs.id = (SELECT fs2.id FROM film_state fs2 WHERE fs2.film_id = fs.film_id ORDER BY fs2.date DESC, fs2.id DESC LIMIT 1)',
      )
      .select('fs.film_id');
    return rows.map((r) => r.film_id);
  }

  async save(filmState: FilmState): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {id, ...data } = FilmStateMapper.toPersistence(filmState);
    const [generatedId] = await this.knex('film_state').insert(data);
    return generatedId;
  }

  async saveMetadataValue(
    filmStateId: number,
    transitionStateMetadataId: number,
    value: string | null,
  ): Promise<void> {
    await this.knex('film_state_metadata').insert({
      film_state_id: filmStateId,
      transition_state_metadata_id: transitionStateMetadataId,
      value,
    });
  }

  async update(filmState: FilmState): Promise<void> {
    const { id, ...data } = FilmStateMapper.toPersistence(filmState);
    await this.knex('film_state').where({ id }).update(data);
  }

  async delete(id: number): Promise<void> {
    await this.knex('film_state').where({ id }).delete();
  }

  private async loadMetadata(filmStateId: number): Promise<FilmStateMetadata[]> {
    const rows = await this.knex('film_state_metadata as fsm')
      .join('transition_state_metadata as tsm', 'tsm.id', 'fsm.transition_state_metadata_id')
      .join('transition_metadata_field as tmf', 'tmf.id', 'tsm.field_id')
      .where('fsm.film_state_id', filmStateId)
      .orderBy('fsm.id', 'asc')
      .select(
        'fsm.id as fsm_id',
        'fsm.film_state_id',
        'fsm.transition_state_metadata_id',
        'fsm.value as fsm_value',
        'tsm.id as tsm_id',
        'tsm.field_id',
        'tsm.transition_state_id',
        'tsm.default_value',
        'tmf.id as tmf_id',
        'tmf.name as field_name',
        'tmf.field_type',
        'tmf.allow_multiple',
      ) as MetadataJoinRow[];

    // Group rows by transition_state_metadata_id. For allow_multiple fields,
    // each value is stored as a separate row — collect them into a string[].
    // For single-value fields there is always exactly one row per field.
    const groups = new Map<number, MetadataJoinRow[]>();
    for (const row of rows) {
      const existing = groups.get(row.transition_state_metadata_id);
      if (existing) {
        existing.push(row);
      } else {
        groups.set(row.transition_state_metadata_id, [row]);
      }
    }

    return [...groups.values()].map((group) => {
      const first = group[0];
      const allowMultiple = Boolean(first.allow_multiple);
      const value: string | string[] | null = allowMultiple
        ? group.map((r) => r.fsm_value).filter((v): v is string => v !== null)
        : first.fsm_value;

      const field = TransitionMetadataField.create({
        id: first.tmf_id,
        name: first.field_name,
        fieldType: first.field_type,
        allowMultiple,
      });

      const tsm = TransitionStateMetadata.create({
        id: first.tsm_id,
        fieldId: first.field_id,
        transitionStateId: first.transition_state_id,
        defaultValue: first.default_value,
        field,
      });

      return FilmStateMetadata.create({
        id: first.fsm_id,
        filmStateId: first.film_state_id,
        transitionStateMetadataId: first.transition_state_metadata_id,
        value,
        transitionStateMetadata: tsm,
      });
    });
  }
}

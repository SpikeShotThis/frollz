import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { FilmStateMetadata } from '../../../domain/film-state/entities/film-state-metadata.entity';
import { IFilmStateRepository } from '../../../domain/film-state/repositories/film-state.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { FilmStateRow, FilmStateMetadataRow } from '../types/db.types';
import { FilmStateMapper } from './film-state.mapper';

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
      .orderBy('date', 'desc');
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
      .orderBy('date', 'desc')
      .first();
    if (!row) return null;
    const filmState = FilmStateMapper.toDomain(row);
    const metadata = await this.loadMetadata(row.id);
    return FilmState.create({ ...filmState, metadata });
  }

  async findFilmIdsByCurrentState(stateIds: number[]): Promise<number[]> {
    const rows = await this.knex<FilmStateRow>('film_state as fs')
      .whereIn('fs.state_id', stateIds)
      .where(
        'fs.date',
        this.knex('film_state as fs2').max('fs2.date').where('fs2.film_id', this.knex.ref('fs.film_id')),
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

  async update(filmState: FilmState): Promise<void> {
    const { id, ...data } = FilmStateMapper.toPersistence(filmState);
    await this.knex('film_state').where({ id }).update(data);
  }

  async delete(id: number): Promise<void> {
    await this.knex('film_state').where({ id }).delete();
  }

  private async loadMetadata(filmStateId: number): Promise<FilmStateMetadata[]> {
    const rows = await this.knex<FilmStateMetadataRow>('film_state_metadata').where({
      film_state_id: filmStateId,
    });
    return rows.map((r) =>
      FilmStateMetadata.create({
        id: r.id,
        filmStateId: r.film_state_id,
        transitionStateMetadataId: r.transition_state_metadata_id,
      }),
    );
  }
}

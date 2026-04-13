import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { Film } from '../../../domain/film/entities/film.entity';
import { FilmFilters, IFilmRepository } from '../../../domain/film/repositories/film.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { FilmRow, FilmTagRow, TagRow } from '../types/db.types';
import { FilmMapper } from './film.mapper';
import { Tag } from '../../../domain/shared/entities/tag.entity';
import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { FilmStateMetadata } from '../../../domain/film-state/entities/film-state-metadata.entity';
import { TransitionState } from '../../../domain/transition/entities/transition-state.entity';
import { TransitionStateMetadata } from '../../../domain/transition/entities/transition-state-metadata.entity';
import { TransitionMetadataField } from '../../../domain/transition/entities/transition-metadata-field.entity';

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
export class FilmKnexRepository implements IFilmRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<Film | null> {
    const row = await this.knex<FilmRow>('film').where({ id }).first();
    return row ? this.hydrate(row) : null;
  }

  async findAll(): Promise<Film[]> {
    const rows = await this.knex<FilmRow>('film').select('*');
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async findWithFilters(filters: FilmFilters): Promise<Film[]> {
    let query = this.knex<FilmRow>('film');

    if (filters.stateIds?.length) {
      query = query.whereIn(
        'id',
        this.knex('film_state as fs2')
          .select('fs2.film_id')
          .whereIn('fs2.state_id', filters.stateIds)
          .whereRaw(
            'fs2.id = (SELECT fs3.id FROM film_state fs3 WHERE fs3.film_id = fs2.film_id ORDER BY fs3.id DESC LIMIT 1)',
          ),
      );
    }

    if (filters.emulsionId !== undefined) {
      query = query.where('emulsion_id', filters.emulsionId);
    }

    if (filters.formatId !== undefined) {
      query = query.whereIn(
        'emulsion_id',
        this.knex('emulsion').select('id').where('format_id', filters.formatId),
      );
    }

    if (filters.tagIds?.length) {
      query = query.whereIn(
        'id',
        this.knex('film_tag').select('film_id').whereIn('tag_id', filters.tagIds),
      );
    }

    if (filters.loadedStateId !== undefined && (filters.loadedDateFrom || filters.loadedDateTo)) {
      let sub = this.knex('film_state as fsd').select('fsd.film_id').where('fsd.state_id', filters.loadedStateId);
      if (filters.loadedDateFrom) sub = sub.where('fsd.date', '>=', filters.loadedDateFrom);
      if (filters.loadedDateTo) sub = sub.where('fsd.date', '<=', filters.loadedDateTo);
      query = query.whereIn('id', sub);
    }

    if (filters.searchQuery) {
      const pattern = `%${filters.searchQuery}%`;
      query = query.where((builder) => {
        builder
          .whereILike('name', pattern)
          .orWhereIn('id', this.knex('film_state').select('film_id').whereILike('note', pattern));
      });
    }

    const rows = await query.select('*');
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async findByEmulsionId(emulsionId: number): Promise<Film[]> {
    const rows = await this.knex<FilmRow>('film').where({ emulsion_id: emulsionId });
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async findChildren(parentId: number): Promise<Film[]> {
    const rows = await this.knex<FilmRow>('film').where({ parent_id: parentId });
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async findByCurrentStateIds(stateIds: number[]): Promise<Film[]> {
    const latestStateSubquery = this.knex('film_state as fs2')
      .select('fs2.film_id')
      .whereIn('fs2.state_id', stateIds)
      .where(
        'fs2.date',
        this.knex('film_state as fs3').max('fs3.date').where('fs3.film_id', this.knex.ref('fs2.film_id')),
      );

    const rows = await this.knex<FilmRow>('film').whereIn('id', latestStateSubquery);
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async save(film: Film): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = FilmMapper.toPersistence(film);
    const [generatedId] = await this.knex('film').insert(data);
    return generatedId;
  }

  async update(film: Film): Promise<void> {
    const { id, ...data } = FilmMapper.toPersistence(film);
    await this.knex('film').where({ id }).update(data);
  }

  async delete(id: number): Promise<void> {
    await this.knex('film').where({ id }).delete();
  }

  private async hydrate(row: FilmRow): Promise<Film> {
    const film = FilmMapper.toDomain(row);
    const [tags, states] = await Promise.all([
      this.loadTags(row.id),
      this.loadStates(row.id),
    ]);
    return Film.create({ ...film, tags, states });
  }

  private async loadTags(filmId: number): Promise<Tag[]> {
    const rows = await this.knex<TagRow>('tag')
      .join<FilmTagRow>('film_tag', 'tag.id', 'film_tag.tag_id')
      .where('film_tag.film_id', filmId)
      .select('tag.*');
    return rows.map((r) =>
      Tag.create({
        id: r.id,
        name: r.name,
        colorCode: r.color_code,
        description: r.description,
      }),
    );
  }

  private async loadStates(filmId: number): Promise<FilmState[]> {
    const rows = await this.knex('film_state as fs')
      .join('transition_state as ts', 'ts.id', 'fs.state_id')
      .where('fs.film_id', filmId)
      .orderBy('fs.id', 'desc')
      .select('fs.id', 'fs.film_id', 'fs.state_id', 'fs.date', 'fs.note', 'ts.name as state_name');

    const metadataMap = await this.loadMetadataForStates(rows.map((r) => r.id));

    return rows.map((r) =>
      FilmState.create({
        id: r.id,
        filmId: r.film_id,
        stateId: r.state_id,
        date: new Date(r.date),
        note: r.note,
        state: TransitionState.create({ id: r.state_id, name: r.state_name }),
        metadata: metadataMap.get(r.id) ?? [],
      }),
    );
  }

  private async loadMetadataForStates(filmStateIds: number[]): Promise<Map<number, FilmStateMetadata[]>> {
    if (filmStateIds.length === 0) return new Map();

    const rows = await this.knex('film_state_metadata as fsm')
      .join('transition_state_metadata as tsm', 'tsm.id', 'fsm.transition_state_metadata_id')
      .join('transition_metadata_field as tmf', 'tmf.id', 'tsm.field_id')
      .whereIn('fsm.film_state_id', filmStateIds)
      .orderBy('fsm.film_state_id', 'asc')
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

    // Group by film_state_id, then by transition_state_metadata_id (for allowMultiple fields)
    const byState = new Map<number, Map<number, MetadataJoinRow[]>>();
    for (const row of rows) {
      if (!byState.has(row.film_state_id)) byState.set(row.film_state_id, new Map());
      const byTsm = byState.get(row.film_state_id)!;
      if (!byTsm.has(row.transition_state_metadata_id)) byTsm.set(row.transition_state_metadata_id, []);
      byTsm.get(row.transition_state_metadata_id)!.push(row);
    }

    const result = new Map<number, FilmStateMetadata[]>();
    for (const [stateId, byTsm] of byState) {
      result.set(
        stateId,
        [...byTsm.values()].map((group) => {
          const first = group[0];
          const allowMultiple = Boolean(first.allow_multiple);
          const value: string | string[] | null = allowMultiple
            ? group.map((r) => r.fsm_value).filter((v): v is string => v !== null)
            : first.fsm_value;

          return FilmStateMetadata.create({
            id: first.fsm_id,
            filmStateId: first.film_state_id,
            transitionStateMetadataId: first.transition_state_metadata_id,
            value,
            transitionStateMetadata: TransitionStateMetadata.create({
              id: first.tsm_id,
              fieldId: first.field_id,
              transitionStateId: first.transition_state_id,
              defaultValue: first.default_value,
              field: TransitionMetadataField.create({
                id: first.tmf_id,
                name: first.field_name,
                fieldType: first.field_type,
                allowMultiple,
              }),
            }),
          });
        }),
      );
    }

    return result;
  }
}

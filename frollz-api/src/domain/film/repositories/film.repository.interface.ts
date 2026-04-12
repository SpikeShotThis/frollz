import { Film } from '../entities/film.entity';

export const FILM_REPOSITORY = 'FILM_REPOSITORY';

export interface FilmFilters {
  stateIds?: number[];
  emulsionId?: number;
  formatId?: number;
  tagIds?: number[];
}

export interface IFilmRepository {
  findById(id: number): Promise<Film | null>;
  findAll(): Promise<Film[]>;
  findWithFilters(filters: FilmFilters): Promise<Film[]>;
  findByEmulsionId(emulsionId: number): Promise<Film[]>;
  findChildren(parentId: number): Promise<Film[]>;
  findByCurrentStateIds(stateIds: number[]): Promise<Film[]>;
  save(film: Film): Promise<number>;
  update(film: Film): Promise<void>;
  delete(id: number): Promise<void>;
}

import { Film } from '../entities/film.entity';

export const FILM_REPOSITORY = 'FILM_REPOSITORY';

export interface IFilmRepository {
  findById(id: number): Promise<Film | null>;
  findAll(): Promise<Film[]>;
  findByemulsionId(emulsionId: number): Promise<Film[]>;
  findChildren(parentId: number): Promise<Film[]>;
  findByCurrentStateIds(stateIds: number[]): Promise<Film[]>;
  save(film: Film): Promise<void>;
  update(film: Film): Promise<void>;
  delete(id: number): Promise<void>;
}

import { Film } from '../entities/film.entity';

export const FILM_REPOSITORY = 'FILM_REPOSITORY';

export interface IFilmRepository {
  findById(id: string): Promise<Film | null>;
  findAll(): Promise<Film[]>;
  findByEmulsionId(emulsionId: string): Promise<Film[]>;
  save(film: Film): Promise<void>;
  update(film: Film): Promise<void>;
  delete(id: string): Promise<void>;
}

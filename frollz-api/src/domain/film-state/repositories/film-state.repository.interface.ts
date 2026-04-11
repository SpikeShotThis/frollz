import { FilmState } from '../entities/film-state.entity';

export const FILM_STATE_REPOSITORY = 'FILM_STATE_REPOSITORY';

export interface IFilmStateRepository {
  findById(id: string): Promise<FilmState | null>;
  findByFilmId(filmId: string): Promise<FilmState[]>;
  findLatestByFilmId(filmId: string): Promise<FilmState | null>;
  save(filmState: FilmState): Promise<void>;
  update(filmState: FilmState): Promise<void>;
  delete(id: string): Promise<void>;
}

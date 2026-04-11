import { FilmState } from '../entities/film-state.entity';

export const FILM_STATE_REPOSITORY = 'FILM_STATE_REPOSITORY';

export interface IFilmStateRepository {
  findById(id: number): Promise<FilmState | null>;
  findByfilmId(filmId: number): Promise<FilmState[]>;
  findLatestByfilmId(filmId: number): Promise<FilmState | null>;
  findfilmIdsByCurrentState(stateIds: string[]): Promise<string[]>;
  save(filmState: FilmState): Promise<void>;
  update(filmState: FilmState): Promise<void>;
  delete(id: number): Promise<void>;
}

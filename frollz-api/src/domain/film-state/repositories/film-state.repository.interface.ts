import { FilmState } from '../entities/film-state.entity';

export const FILM_STATE_REPOSITORY = 'FILM_STATE_REPOSITORY';

export interface IFilmStateRepository {
  findById(id: number): Promise<FilmState | null>;
  findByFilmId(filmId: number): Promise<FilmState[]>;
  findLatestByFilmId(filmId: number): Promise<FilmState | null>;
  findFilmIdsByCurrentState(stateIds: number[]): Promise<number[]>;
  save(filmState: FilmState): Promise<number>;
  saveMetadataValue(filmStateId: number, transitionStateMetadataId: number, value: string | null): Promise<void>;
  update(filmState: FilmState): Promise<void>;
  delete(id: number): Promise<void>;
}

import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { FilmStateRow } from '../types/db.types';

export class FilmStateMapper {
  static toDomain(row: FilmStateRow): FilmState {
    return FilmState.create({
      id: row.id,
      filmId: row.film_id,
      stateId: row.state_id,
      date: new Date(row.date),
    });
  }

  static toPersistence(filmState: FilmState): FilmStateRow {
    return {
      id: filmState.id,
      film_id: filmState.filmId,
      state_id: filmState.stateId,
      date: filmState.date,
    };
  }
}

import { FilmState } from '../../../domain/film-state/entities/film-state.entity';
import { FilmStateRow } from '../types/db.types';

export class FilmStateMapper {
  static toDomain(row: FilmStateRow): FilmState {
    return FilmState.create({
      id: row.id.trim(),
      filmId: row.film_id.trim(),
      stateId: row.state_id.trim(),
      date: new Date(row.date),
      note: row.note,
    });
  }

  static toPersistence(filmState: FilmState): FilmStateRow {
    return {
      id: filmState.id,
      film_id: filmState.filmId,
      state_id: filmState.stateId,
      date: filmState.date,
      note: filmState.note,
    };
  }
}

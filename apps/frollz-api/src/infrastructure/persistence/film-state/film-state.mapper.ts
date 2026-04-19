import { FilmState } from "../../../domain/film-state/entities/film-state.entity";
import { TransitionState } from "../../../domain/transition/entities/transition-state.entity";
import { FilmStateRow } from "../types/db.types";

export interface FilmStateRowWithState extends FilmStateRow {
  state_name: string;
}

export class FilmStateMapper {
  static toDomain(row: FilmStateRow | FilmStateRowWithState): FilmState {
    return FilmState.create({
      id: row.id,
      filmId: row.film_id,
      stateId: row.state_id,
      date: new Date(row.date),
      state: "state_name" in row
        ? TransitionState.create({ id: row.state_id, name: row.state_name })
        : undefined,
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

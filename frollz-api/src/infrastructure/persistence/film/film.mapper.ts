import { Film } from '../../../domain/film/entities/film.entity';
import { FilmRow } from '../types/db.types';

export class FilmMapper {
  static toDomain(row: FilmRow): Film {
    return Film.create({
      id: row.id.trim(),
      name: row.name,
      emulsionId: row.emulsion_id.trim(),
      expirationDate: new Date(row.expiration_date),
      parentId: row.parent_id ? row.parent_id.trim() : null,
    });
  }

  static toPersistence(film: Film): FilmRow {
    return {
      id: film.id,
      name: film.name,
      emulsion_id: film.emulsionId,
      expiration_date: film.expirationDate,
      parent_id: film.parentId,
    };
  }
}

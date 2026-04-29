import type { CreateFilmLabRequest, FilmLab, ListFilmLabsQuery, UpdateFilmLabRequest } from '@frollz2/schema';

export abstract class FilmLabRepository {
  abstract list(userId: number, query: ListFilmLabsQuery): Promise<FilmLab[]>;
  abstract findById(userId: number, filmLabId: number): Promise<FilmLab | null>;
  abstract findByName(userId: number, name: string): Promise<FilmLab | null>;
  abstract create(userId: number, input: CreateFilmLabRequest): Promise<FilmLab>;
  abstract update(userId: number, filmLabId: number, input: UpdateFilmLabRequest): Promise<FilmLab | null>;
}

import type {
  FilmDetail,
  FilmJourneyEvent,
  FilmListQuery,
  FilmSummary,
  FilmUpdateRequest
} from '@frollz2/schema';

export abstract class FilmRepository {
  abstract list(userId: number, query: FilmListQuery): Promise<FilmSummary[]>;

  abstract findById(userId: number, filmId: number): Promise<FilmDetail | null>;

  abstract findByIdSummary(userId: number, filmId: number): Promise<FilmSummary | null>;

  abstract update(userId: number, filmId: number, input: FilmUpdateRequest): Promise<FilmSummary | null>;

  abstract listEvents(userId: number, filmId: number): Promise<FilmJourneyEvent[]>;

  abstract findOccupiedFilmForReceiverId(userId: number, receiverId: number): Promise<number | null>;
}

import type {
  DeviceLoadTimelineEvent,
  FilmDetail,
  FilmJourneyEvent,
  FilmListQuery,
  FilmSummary,
  FilmUnit,
  FilmUpdateRequest
} from '@frollz2/schema';

export abstract class FilmRepository {
  abstract list(userId: number, query: FilmListQuery): Promise<FilmSummary[]>;

  abstract findById(userId: number, filmId: number): Promise<FilmDetail | null>;

  abstract findByIdSummary(userId: number, filmId: number): Promise<FilmSummary | null>;

  abstract update(userId: number, filmId: number, input: FilmUpdateRequest): Promise<FilmSummary | null>;

  abstract listEvents(userId: number, filmId: number): Promise<FilmJourneyEvent[]>;

  abstract listUnits(userId: number, filmId: number): Promise<FilmUnit[]>;

  abstract listDeviceLoadEvents(userId: number, deviceId: number): Promise<DeviceLoadTimelineEvent[]>;

  abstract findOccupiedFilmForDeviceId(userId: number, deviceId: number): Promise<number | null>;
}

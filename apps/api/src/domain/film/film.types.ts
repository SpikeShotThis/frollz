import type { Id, FilmCreateRequest, FilmDetail, FilmListQuery, FilmSummary, FilmUpdateRequest } from '@frollz2/schema';

export type Film = FilmSummary;
export type FilmAggregate = FilmDetail;
export type CreateFilmInput = FilmCreateRequest;
export type UpdateFilmInput = FilmUpdateRequest;
export type FilmFilter = FilmListQuery;

export type FilmId = Id;

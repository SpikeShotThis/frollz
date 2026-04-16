export const FILM_TAG_REPOSITORY = "FILM_TAG_REPOSITORY";

export interface IFilmTagRepository {
  add(filmId: number, tagid: number): Promise<void>;
  remove(filmId: number, tagid: number): Promise<void>;
}

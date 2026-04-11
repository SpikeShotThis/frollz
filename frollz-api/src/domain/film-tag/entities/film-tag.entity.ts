export class FilmTag {
  constructor(
    public readonly filmId: number,
    public readonly tagid: number,
  ) {}

  static create(props: { filmId: number; tagid: number }): FilmTag {
    return new FilmTag(props.filmId, props.tagid);
  }
}

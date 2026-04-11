import { Emulsion } from '../../emulsion/entities/emulsion.entity';
import { FilmState } from '../../film-state/entities/film-state.entity';
import { Tag } from '../../shared/entities/tag.entity';

export class Film {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly emulsionId: string,
    public readonly expirationDate: Date,
    public readonly parentId: string | null,
    public readonly emulsion?: Emulsion,
    public readonly tags: Tag[] = [],
    public readonly states: FilmState[] = [],
    public readonly parent?: Film,
  ) {}

  static create(props: {
    id: string;
    name: string;
    emulsionId: string;
    expirationDate: Date;
    parentId?: string | null;
    emulsion?: Emulsion;
    tags?: Tag[];
    states?: FilmState[];
    parent?: Film;
  }): Film {
    return new Film(
      props.id,
      props.name,
      props.emulsionId,
      props.expirationDate,
      props.parentId ?? null,
      props.emulsion,
      props.tags ?? [],
      props.states ?? [],
      props.parent,
    );
  }

  get currentState(): FilmState | null {
    if (this.states.length === 0) return null;
    return this.states.reduce((latest, state) =>
      state.date > latest.date ? state : latest,
    );
  }
}

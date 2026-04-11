import { TransitionStateMetadata } from '../../transition/entities/transition-state-metadata.entity';

export class FilmStateMetadata {
  constructor(
    public readonly id: number,
    public readonly filmStateId: number,
    public readonly transitionStateMetadataId: number,
    public readonly transitionStateMetadata?: TransitionStateMetadata,
  ) {}

  static create(props: {
    id: number;
    filmStateId: number;
    transitionStateMetadataId: number;
    transitionStateMetadata?: TransitionStateMetadata;
  }): FilmStateMetadata {
    return new FilmStateMetadata(
      props.id,
      props.filmStateId,
      props.transitionStateMetadataId,
      props.transitionStateMetadata,
    );
  }
}

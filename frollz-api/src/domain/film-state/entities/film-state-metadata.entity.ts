import { TransitionStateMetadata } from '../../transition/entities/transition-state-metadata.entity';

export class FilmStateMetadata {
  constructor(
    public readonly id: string,
    public readonly filmStateId: string,
    public readonly transitionStateMetadataId: string,
    public readonly transitionStateMetadata?: TransitionStateMetadata,
  ) {}

  static create(props: {
    id: string;
    filmStateId: string;
    transitionStateMetadataId: string;
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

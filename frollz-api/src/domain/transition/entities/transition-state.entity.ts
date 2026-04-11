import { TransitionStateMetadata } from './transition-state-metadata.entity';

export class TransitionState {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly metadata: TransitionStateMetadata[] = [],
  ) {}

  static create(props: { id: string; name: string; metadata?: TransitionStateMetadata[] }): TransitionState {
    return new TransitionState(props.id, props.name, props.metadata ?? []);
  }
}

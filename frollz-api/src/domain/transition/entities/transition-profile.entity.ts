export class TransitionProfile {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  static create(props: { id: string; name: string }): TransitionProfile {
    return new TransitionProfile(props.id, props.name);
  }
}

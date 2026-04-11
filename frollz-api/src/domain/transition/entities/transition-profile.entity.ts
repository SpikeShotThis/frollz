export class TransitionProfile {
  constructor(
    public readonly id: number,
    public readonly name: string,
  ) {}

  static create(props: { id: number; name: string }): TransitionProfile {
    return new TransitionProfile(props.id, props.name);
  }
}

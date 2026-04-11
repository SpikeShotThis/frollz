export class EmulsionTag {
  constructor(
    public readonly emulsionId: number,
    public readonly tagid: number,
  ) {}

  static create(props: { emulsionId: number; tagid: number }): EmulsionTag {
    return new EmulsionTag(props.emulsionId, props.tagId);
  }
}

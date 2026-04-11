export class Tag {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly colorCode: string,
    public readonly description: string | null,
  ) {}

  static create(props: { id: number; name: string; colorCode: string; description?: string | null }): Tag {
    return new Tag(props.id, props.name, props.colorCode, props.description ?? null);
  }
}

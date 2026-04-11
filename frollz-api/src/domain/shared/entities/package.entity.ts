export class Package {
  constructor(
    public readonly id: number,
    public readonly name: string,
  ) {}

  static create(props: { id: number; name: string }): Package {
    return new Package(props.id, props.name);
  }
}

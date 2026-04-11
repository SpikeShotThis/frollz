export class Package {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  static create(props: { id: string; name: string }): Package {
    return new Package(props.id, props.name);
  }
}

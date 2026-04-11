export class Process {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  static create(props: { id: string; name: string }): Process {
    return new Process(props.id, props.name);
  }
}

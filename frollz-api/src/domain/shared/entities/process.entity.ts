export class Process {
  constructor(
    public readonly id: number,
    public readonly name: string,
  ) {}

  static create(props: { id: number; name: string }): Process {
    return new Process(props.id, props.name);
  }
}

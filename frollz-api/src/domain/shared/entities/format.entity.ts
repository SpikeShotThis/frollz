import { Package } from './package.entity';

export class Format {
  constructor(
    public readonly id: string,
    public readonly packageId: string,
    public readonly name: string,
    public readonly pkg?: Package,
  ) {}

  static create(props: { id: string; packageId: string; name: string; pkg?: Package }): Format {
    return new Format(props.id, props.packageId, props.name, props.pkg);
  }
}

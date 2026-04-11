import { Package } from './package.entity';

export class Format {
  constructor(
    public readonly packageid: number,
    public readonly name: string,
    public readonly pkg?: Package,
  ) {}

  static create(props: {  packageid: number; name: string; pkg?: Package }): Format {
    return new Format( props.packageId, props.name, props.pkg);
  }
}

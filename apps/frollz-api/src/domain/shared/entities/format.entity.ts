import { Package } from "./package.entity";

export class Format {
  constructor(
    public readonly id: number,
    public readonly packageId: number,
    public readonly name: string,
    public readonly pkg?: Package,
  ) {}

  static create(props: {
    id?: number;
    packageId: number;
    name: string;
    pkg?: Package;
  }): Format {
    return new Format(props.id ?? 0, props.packageId, props.name, props.pkg);
  }
}

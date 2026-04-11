import { Format } from '../../shared/entities/format.entity';
import { Process } from '../../shared/entities/process.entity';
import { Tag } from '../../shared/entities/tag.entity';

export class Emulsion {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly brand: string,
    public readonly manufacturer: string,
    public readonly speed: number,
    public readonly processId: number,
    public readonly formatId: number,
    public readonly parentId: number | null,
    public readonly process?: Process,
    public readonly format?: Format,
    public readonly tags: Tag[] = [],
    public readonly parent?: Emulsion,
  ) {}

  static create(props: {
    id: number;
    name: string;
    brand: string;
    manufacturer: string;
    speed: number;
    processId: number;
    formatId: number;
    parentId?: number | null;
    process?: Process;
    format?: Format;
    tags?: Tag[];
    parent?: Emulsion;
  }): Emulsion {
    return new Emulsion(
      props.id,
      props.name,
      props.brand,
      props.manufacturer,
      props.speed,
      props.processId,
      props.formatId,
      props.parentId ?? null,
      props.process,
      props.format,
      props.tags ?? [],
      props.parent,
    );
  }
}

import { Format } from '../../shared/entities/format.entity';
import { Process } from '../../shared/entities/process.entity';
import { Tag } from '../../shared/entities/tag.entity';

export class Emulsion {
  constructor(
    public readonly id: number,
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
    public readonly boxImageData?: Buffer | null,
    public readonly boxImageMimeType?: string | null,
  ) {}

  static create(props: {
    id?: number;
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
    boxImageData?: Buffer | null;
    boxImageMimeType?: string | null;
  }): Emulsion {
    return new Emulsion(
      props.id ?? 0,
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
      props.boxImageData ?? null,
      props.boxImageMimeType ?? null,
    );
  }
}

import { Emulsion } from '../../../domain/emulsion/entities/emulsion.entity';
import { EmulsionRow } from '../types/db.types';

export class EmulsionMapper {
  static toDomain(row: EmulsionRow): Emulsion {
    return Emulsion.create({
      id: row.id,
      name: row.name,
      brand: row.brand,
      manufacturer: row.manufacturer,
      speed: row.speed,
      processId: row.process_id,
      formatId: row.format_id,
      parentId: row.parent_id,
    });
  }

  static toPersistence(emulsion: Emulsion): EmulsionRow {
    return {
      id: emulsion.id,
      name: emulsion.name,
      brand: emulsion.brand,
      manufacturer: emulsion.manufacturer,
      speed: emulsion.speed,
      process_id: emulsion.processId,
      format_id: emulsion.formatId,
      parent_id: emulsion.parentId,
    };
  }
}

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
      boxImageData: row.box_image_data ?? null,
      boxImageMimeType: row.box_image_mime_type ?? null,
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
      box_image_data: emulsion.boxImageData ?? null,
      box_image_mime_type: emulsion.boxImageMimeType ?? null,
    };
  }
}

import { TransitionMetadataField } from "../../../domain/transition/entities/transition-metadata-field.entity";
import { TransitionMetadataFieldRow } from "../types/db.types";

export class TransitionMetadataFieldMapper {
  static toDomain(row: TransitionMetadataFieldRow): TransitionMetadataField {
    return TransitionMetadataField.create({
      id: row.id,
      name: row.name,
      fieldType: row.field_type,
      allowMultiple: Boolean(row.allow_multiple),
    });
  }
}

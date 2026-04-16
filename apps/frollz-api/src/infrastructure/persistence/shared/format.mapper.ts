import { Format } from "../../../domain/shared/entities/format.entity";
import { FormatRow } from "../types/db.types";

export class FormatMapper {
  static toDomain(row: FormatRow): Format {
    return Format.create({
      id: row.id,
      packageId: row.package_id,
      name: row.name,
    });
  }
}

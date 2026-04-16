import { Package } from "../../../domain/shared/entities/package.entity";
import { PackageRow } from "../types/db.types";

export class PackageMapper {
  static toDomain(row: PackageRow): Package {
    return Package.create({ id: row.id, name: row.name });
  }
}

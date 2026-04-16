import { Process } from "../../../domain/shared/entities/process.entity";
import { ProcessRow } from "../types/db.types";

export class ProcessMapper {
  static toDomain(row: ProcessRow): Process {
    return Process.create({ id: row.id, name: row.name });
  }
}

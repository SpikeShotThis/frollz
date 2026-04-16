import { Injectable } from "@nestjs/common";
import { Format } from "../../../domain/shared/entities/format.entity";
import { IFormatRepository } from "../../../domain/shared/repositories/format.repository.interface";
import { FormatRow } from "../types/db.types";
import { BaseKnexRepository } from "../base.knex.repository";
import { FormatMapper } from "./format.mapper";

@Injectable()
export class FormatKnexRepository
  extends BaseKnexRepository
  implements IFormatRepository
{
  async findById(id: number): Promise<Format | null> {
    const row = await this.db<FormatRow>("format").where({ id }).first();
    return row ? FormatMapper.toDomain(row) : null;
  }

  async findAll(): Promise<Format[]> {
    const rows = await this.db<FormatRow>("format").select("*").orderBy("name");
    return rows.map((r) => FormatMapper.toDomain(r));
  }

  async findByPackageId(packageId: number): Promise<Format[]> {
    const rows = await this.db<FormatRow>("format")
      .where({ package_id: packageId })
      .orderBy("name");
    return rows.map((r) => FormatMapper.toDomain(r));
  }

  async save(format: Format): Promise<number> {
    const [generatedId] = await this.db("format").insert({
      package_id: format.packageId,
      name: format.name,
    });
    return generatedId;
  }

  async update(format: Format): Promise<void> {
    await this.db("format").where({ id: format.id }).update({
      package_id: format.packageId,
      name: format.name,
    });
  }

  async delete(id: number): Promise<void> {
    await this.db("format").where({ id }).delete();
  }
}

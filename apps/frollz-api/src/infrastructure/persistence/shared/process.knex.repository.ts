import { Injectable } from "@nestjs/common";
import { Process } from "../../../domain/shared/entities/process.entity";
import { IProcessRepository } from "../../../domain/shared/repositories/process.repository.interface";
import { ProcessRow } from "../types/db.types";
import { BaseKnexRepository } from "../base.knex.repository";
import { ProcessMapper } from "./process.mapper";

@Injectable()
export class ProcessKnexRepository
  extends BaseKnexRepository
  implements IProcessRepository
{
  async findById(id: number): Promise<Process | null> {
    const row = await this.db<ProcessRow>("process").where({ id }).first();
    return row ? ProcessMapper.toDomain(row) : null;
  }

  async findAll(): Promise<Process[]> {
    const rows = await this.db<ProcessRow>("process")
      .select("*")
      .orderBy("name");
    return rows.map((r) => ProcessMapper.toDomain(r));
  }

  async findByName(name: string): Promise<Process | null> {
    const row = await this.db<ProcessRow>("process").where({ name }).first();
    return row ? ProcessMapper.toDomain(row) : null;
  }

  async save(process: Process): Promise<void> {
    const payload: Record<string, unknown> = { name: process.name };
    if (process.id) payload.id = process.id;
    await this.db("process").insert(payload);
  }

  async update(process: Process): Promise<void> {
    await this.db("process")
      .where({ id: process.id })
      .update({ name: process.name });
  }

  async delete(id: number): Promise<void> {
    await this.db("process").where({ id }).delete();
  }
}

import { Injectable } from "@nestjs/common";
import { Tag } from "../../../domain/shared/entities/tag.entity";
import { ITagRepository } from "../../../domain/shared/repositories/tag.repository.interface";
import { TagRow } from "../types/db.types";
import { BaseKnexRepository } from "../base.knex.repository";
import { TagMapper } from "./tag.mapper";

@Injectable()
export class TagKnexRepository
  extends BaseKnexRepository
  implements ITagRepository
{
  async findById(id: number): Promise<Tag | null> {
    const row = await this.db<TagRow>("tag").where({ id }).first();
    return row ? TagMapper.toDomain(row) : null;
  }

  async findAll(): Promise<Tag[]> {
    const rows = await this.db<TagRow>("tag").select("*").orderBy("name");
    return rows.map((r) => TagMapper.toDomain(r));
  }

  async findByName(name: string): Promise<Tag | null> {
    const row = await this.db<TagRow>("tag").where({ name }).first();
    return row ? TagMapper.toDomain(row) : null;
  }

  async save(tag: Tag): Promise<number> {
    const [generatedId] = await this.db("tag").insert({
      name: tag.name,
      color_code: tag.colorCode,
      description: tag.description,
    });
    return generatedId;
  }

  async update(tag: Tag): Promise<void> {
    await this.db("tag").where({ id: tag.id }).update({
      name: tag.name,
      color_code: tag.colorCode,
      description: tag.description,
    });
  }

  async delete(id: number): Promise<void> {
    await this.db("tag").where({ id }).delete();
  }
}

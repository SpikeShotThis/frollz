import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";
import { Tag } from "./entities/tag.entity";

function mapTag(row: Record<string, unknown>): Tag {
  return {
    _key: row.id as string,
    value: row.value as string,
    color: row.color as string,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
  };
}

@Injectable()
export class TagService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const id = randomUUID();
    const now = new Date();

    await this.databaseService.execute(
      `INSERT INTO tags (id, value, color, created_at) VALUES ($1, $2, $3, $4)`,
      [id, createTagDto.value, createTagDto.color, now],
    );

    return {
      _key: id,
      value: createTagDto.value,
      color: createTagDto.color,
      createdAt: now,
    };
  }

  async findAll(): Promise<Tag[]> {
    const rows = await this.databaseService.query(
      `SELECT * FROM tags ORDER BY value ASC`,
    );
    return rows.map(mapTag);
  }

  async findOne(key: string): Promise<Tag | null> {
    const rows = await this.databaseService.query(
      `SELECT * FROM tags WHERE id = $1`,
      [key],
    );
    return rows.length > 0 ? mapTag(rows[0]) : null;
  }

  async update(key: string, updateTagDto: UpdateTagDto): Promise<Tag | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updateTagDto.value !== undefined) {
      updates.push(`value = $${idx++}`);
      values.push(updateTagDto.value);
    }
    if (updateTagDto.color !== undefined) {
      updates.push(`color = $${idx++}`);
      values.push(updateTagDto.color);
    }

    if (updates.length === 0) return this.findOne(key);

    values.push(key);
    await this.databaseService.execute(
      `UPDATE tags SET ${updates.join(", ")} WHERE id = $${idx}`,
      values,
    );

    return this.findOne(key);
  }

  async remove(key: string): Promise<boolean> {
    await this.databaseService.execute(`DELETE FROM tags WHERE id = $1`, [key]);
    return true;
  }
}

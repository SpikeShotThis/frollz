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
    isRollScoped: row.is_roll_scoped as boolean | undefined,
    isStockScoped: row.is_stock_scoped as boolean | undefined,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  };
}

@Injectable()
export class TagService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const id = randomUUID();
    const now = new Date();
    const isRollScoped = createTagDto.isRollScoped ?? true;
    const isStockScoped = createTagDto.isStockScoped ?? true;

    await this.databaseService.execute(
      `INSERT INTO tags (id, value, color, is_roll_scoped, is_stock_scoped, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        createTagDto.value,
        createTagDto.color,
        isRollScoped,
        isStockScoped,
        now,
      ],
    );

    return {
      _key: id,
      value: createTagDto.value,
      color: createTagDto.color,
      isRollScoped,
      isStockScoped,
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
      `SELECT * FROM tags WHERE id = ?`,
      [key],
    );
    return rows.length > 0 ? mapTag(rows[0]) : null;
  }

  async update(key: string, updateTagDto: UpdateTagDto): Promise<Tag | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (updateTagDto.value !== undefined) {
      updates.push(`value = ?`);
      values.push(updateTagDto.value);
    }
    if (updateTagDto.color !== undefined) {
      updates.push(`color = ?`);
      values.push(updateTagDto.color);
    }
    if (updateTagDto.isRollScoped !== undefined) {
      updates.push(`is_roll_scoped = ?`);
      values.push(updateTagDto.isRollScoped);
    }
    if (updateTagDto.isStockScoped !== undefined) {
      updates.push(`is_stock_scoped = ?`);
      values.push(updateTagDto.isStockScoped);
    }

    if (updates.length === 0) return this.findOne(key);

    updates.push(`updated_at = ?`);
    values.push(new Date());
    values.push(key);

    await this.databaseService.execute(
      `UPDATE tags SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    return this.findOne(key);
  }

  async remove(key: string): Promise<boolean> {
    const rows = await this.databaseService.query<{ id: string }>(
      `DELETE FROM tags WHERE id = ? RETURNING id`,
      [key],
    );
    return rows.length > 0;
  }
}

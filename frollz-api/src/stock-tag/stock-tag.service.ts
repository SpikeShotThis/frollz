import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import { CreateStockTagDto } from "./dto/create-stock-tag.dto";
import { StockTag } from "./entities/stock-tag.entity";

function mapStockTag(row: Record<string, unknown>): StockTag {
  return {
    _key: row.id as string,
    stockKey: row.stock_key as string,
    tagKey: row.tag_key as string,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
  };
}

@Injectable()
export class StockTagService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createStockTagDto: CreateStockTagDto): Promise<StockTag> {
    const id = randomUUID();
    const now = new Date();

    await this.databaseService.execute(
      `INSERT INTO stock_tags (id, stock_key, tag_key, created_at) VALUES (?, ?, ?, ?)`,
      [id, createStockTagDto.stockKey, createStockTagDto.tagKey, now],
    );

    return {
      _key: id,
      stockKey: createStockTagDto.stockKey,
      tagKey: createStockTagDto.tagKey,
      createdAt: now,
    };
  }

  async findAll(): Promise<StockTag[]> {
    const rows = await this.databaseService.query(`SELECT * FROM stock_tags`);
    return rows.map(mapStockTag);
  }

  async findByStock(stockKey: string): Promise<StockTag[]> {
    const rows = await this.databaseService.query(
      `SELECT * FROM stock_tags WHERE stock_key = ?`,
      [stockKey],
    );
    return rows.map(mapStockTag);
  }

  async findByTag(tagKey: string): Promise<StockTag[]> {
    const rows = await this.databaseService.query(
      `SELECT * FROM stock_tags WHERE tag_key = ?`,
      [tagKey],
    );
    return rows.map(mapStockTag);
  }

  async findOne(key: string): Promise<StockTag | null> {
    const rows = await this.databaseService.query(
      `SELECT * FROM stock_tags WHERE id = ?`,
      [key],
    );
    return rows.length > 0 ? mapStockTag(rows[0]) : null;
  }

  async remove(key: string): Promise<boolean> {
    const rows = await this.databaseService.query<{ id: string }>(
      `DELETE FROM stock_tags WHERE id = ? RETURNING id`,
      [key],
    );
    return rows.length > 0;
  }
}

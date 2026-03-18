import { Injectable } from "@nestjs/common";

const toSlug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
import { DatabaseService } from "../database/database.service";
import { CreateStockDto } from "./dto/create-stock.dto";
import { CreateStockMultipleFormatsDto } from "./dto/create-stock-multiple-formats.dto";
import { UpdateStockDto } from "./dto/update-stock.dto";
import { Stock } from "./entities/stock.entity";

function mapStock(row: Record<string, unknown>): Stock {
  return {
    _key: row.id as string,
    formatKey: row.format_key as string,
    process: row.process as Stock["process"],
    manufacturer: row.manufacturer as string,
    brand: row.brand as string,
    baseStockKey: row.base_stock_key as string | undefined,
    speed: Number(row.speed),
    boxImageUrl: row.box_image_url as string | undefined,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  };
}

@Injectable()
export class StockService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createStockDto: CreateStockDto): Promise<Stock> {
    const id = `${toSlug(createStockDto.manufacturer)}-${toSlug(createStockDto.brand)}-${createStockDto.speed}-${createStockDto.formatKey}`;
    const now = new Date();

    await this.databaseService.execute(
      `INSERT INTO stocks (id, format_key, process, manufacturer, brand, base_stock_key, speed, box_image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        createStockDto.formatKey,
        createStockDto.process,
        createStockDto.manufacturer,
        createStockDto.brand,
        createStockDto.baseStockKey ?? null,
        createStockDto.speed,
        createStockDto.boxImageUrl ?? null,
        now,
        now,
      ],
    );

    return { ...createStockDto, _key: id, createdAt: now, updatedAt: now };
  }

  async createMultipleFormats(
    dto: CreateStockMultipleFormatsDto,
  ): Promise<Stock[]> {
    const now = new Date();

    return Promise.all(
      dto.formatKeys.map(async (formatKey) => {
        const id = `${toSlug(dto.manufacturer)}-${toSlug(dto.brand)}-${dto.speed}-${formatKey}`;

        await this.databaseService.execute(
          `INSERT INTO stocks (id, format_key, process, manufacturer, brand, base_stock_key, speed, box_image_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [
            id,
            formatKey,
            dto.process,
            dto.manufacturer,
            dto.brand,
            dto.baseStockKey ?? null,
            dto.speed,
            dto.boxImageUrl ?? null,
            now,
            now,
          ],
        );

        return {
          _key: id,
          formatKey,
          process: dto.process,
          manufacturer: dto.manufacturer,
          brand: dto.brand,
          ...(dto.baseStockKey && { baseStockKey: dto.baseStockKey }),
          ...(dto.boxImageUrl && { boxImageUrl: dto.boxImageUrl }),
          speed: dto.speed,
          createdAt: now,
          updatedAt: now,
        };
      }),
    );
  }

  async findAll(): Promise<Stock[]> {
    const rows = await this.databaseService.query(
      `SELECT s.*, f.format AS format_label
       FROM stocks s
       LEFT JOIN film_formats f ON f.id = s.format_key`,
    );
    return rows.map((row) => ({
      ...mapStock(row),
      format: row.format_label as string | undefined,
    }));
  }

  async findOne(key: string): Promise<Stock | null> {
    const rows = await this.databaseService.query(
      `SELECT s.*, f.format AS format_label
       FROM stocks s
       LEFT JOIN film_formats f ON f.id = s.format_key
       WHERE s.id = ?`,
      [key],
    );
    if (rows.length === 0) return null;
    return {
      ...mapStock(rows[0]),
      format: rows[0].format_label as string | undefined,
    };
  }

  async update(
    key: string,
    updateStockDto: UpdateStockDto,
  ): Promise<Stock | null> {
    const fieldMap: Record<string, string> = {
      formatKey: "format_key",
      process: "process",
      manufacturer: "manufacturer",
      brand: "brand",
      baseStockKey: "base_stock_key",
      speed: "speed",
      boxImageUrl: "box_image_url",
    };

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const [prop, col] of Object.entries(fieldMap)) {
      if ((updateStockDto as Record<string, unknown>)[prop] !== undefined) {
        updates.push(`${col} = ?`);
        values.push((updateStockDto as Record<string, unknown>)[prop]);
      }
    }

    if (updates.length === 0) return this.findOne(key);

    updates.push(`updated_at = ?`);
    values.push(new Date());
    values.push(key);

    await this.databaseService.execute(
      `UPDATE stocks SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    return this.findOne(key);
  }

  async remove(key: string): Promise<boolean> {
    const rows = await this.databaseService.query<{ id: string }>(
      `DELETE FROM stocks WHERE id = ? RETURNING id`,
      [key],
    );
    return rows.length > 0;
  }

  async getBrands(query: string): Promise<string[]> {
    const rows = await this.databaseService.query(
      `SELECT DISTINCT brand FROM stocks WHERE LOWER(brand) LIKE ? ORDER BY brand`,
      [`%${query.toLowerCase()}%`],
    );
    return rows.map((r) => r.brand as string);
  }

  async getManufacturers(query: string): Promise<string[]> {
    const rows = await this.databaseService.query(
      `SELECT DISTINCT manufacturer FROM stocks WHERE LOWER(manufacturer) LIKE ? ORDER BY manufacturer`,
      [`%${query.toLowerCase()}%`],
    );
    return rows.map((r) => r.manufacturer as string);
  }

  async getSpeeds(query: string): Promise<number[]> {
    const rows = await this.databaseService.query(
      `SELECT DISTINCT speed FROM stocks WHERE speed::text LIKE ? ORDER BY speed`,
      [`%${query}%`],
    );
    return rows.map((r) => Number(r.speed));
  }
}

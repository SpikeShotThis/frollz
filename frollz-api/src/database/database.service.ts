import { Injectable, Inject, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const DDL = `
  CREATE TABLE IF NOT EXISTS film_formats (
    id TEXT PRIMARY KEY,
    form_factor TEXT NOT NULL,
    format TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS film_formats_default (
    id TEXT PRIMARY KEY,
    form_factor TEXT NOT NULL,
    format TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tags_default (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id TEXT PRIMARY KEY,
    format_key TEXT REFERENCES film_formats(id),
    process TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    brand TEXT NOT NULL,
    base_stock_key TEXT REFERENCES stocks(id),
    speed INTEGER NOT NULL,
    box_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS stocks_default (
    id TEXT PRIMARY KEY,
    format_key TEXT REFERENCES film_formats_default(id),
    process TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    brand TEXT NOT NULL,
    base_stock_key TEXT REFERENCES stocks_default(id),
    speed INTEGER NOT NULL,
    box_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS stock_tags (
    id TEXT PRIMARY KEY,
    stock_key TEXT NOT NULL REFERENCES stocks(id),
    tag_key TEXT NOT NULL REFERENCES tags(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stock_key, tag_key)
  );

  CREATE TABLE IF NOT EXISTS stock_tags_default (
    id TEXT PRIMARY KEY,
    stock_key TEXT NOT NULL REFERENCES stocks_default(id),
    tag_key TEXT NOT NULL REFERENCES tags_default(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stock_key, tag_key)
  );

  CREATE TABLE IF NOT EXISTS rolls (
    id TEXT PRIMARY KEY,
    roll_id TEXT NOT NULL,
    stock_key TEXT NOT NULL REFERENCES stocks(id),
    state TEXT NOT NULL,
    images_url TEXT,
    date_obtained TIMESTAMPTZ NOT NULL,
    obtainment_method TEXT NOT NULL,
    obtained_from TEXT NOT NULL,
    expiration_date TIMESTAMPTZ,
    times_exposed_to_xrays INTEGER NOT NULL DEFAULT 0,
    loaded_into TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS roll_states (
    id TEXT PRIMARY KEY,
    state_id TEXT NOT NULL UNIQUE,
    roll_id TEXT NOT NULL REFERENCES rolls(id),
    state TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
  );
`;

// Maps seed JSON filename base → { table, columns mapping }
const SEED_TABLE_MAP: Record<string, { table: string; defaultTable: string }> =
  {
    "film-formats": {
      table: "film_formats",
      defaultTable: "film_formats_default",
    },
    stocks: { table: "stocks", defaultTable: "stocks_default" },
    tags: { table: "tags", defaultTable: "tags_default" },
    "stock-tags": { table: "stock_tags", defaultTable: "stock_tags_default" },
  };

// Maps camelCase JSON field names to snake_case postgres column names per table
const COLUMN_MAP: Record<string, Record<string, string>> = {
  film_formats: {
    formFactor: "form_factor",
    format: "format",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  film_formats_default: {
    formFactor: "form_factor",
    format: "format",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  stocks: {
    formatKey: "format_key",
    process: "process",
    manufacturer: "manufacturer",
    brand: "brand",
    baseStockKey: "base_stock_key",
    speed: "speed",
    boxImageUrl: "box_image_url",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  stocks_default: {
    formatKey: "format_key",
    process: "process",
    manufacturer: "manufacturer",
    brand: "brand",
    baseStockKey: "base_stock_key",
    speed: "speed",
    boxImageUrl: "box_image_url",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  tags: {
    value: "value",
    color: "color",
    createdAt: "created_at",
  },
  tags_default: {
    value: "value",
    color: "color",
    createdAt: "created_at",
  },
  stock_tags: {
    stockKey: "stock_key",
    tagKey: "tag_key",
    createdAt: "created_at",
  },
  stock_tags_default: {
    stockKey: "stock_key",
    tagKey: "tag_key",
    createdAt: "created_at",
  },
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(@Inject("POSTGRES_POOL") private readonly pool: Pool) {}

  async onModuleInit() {
    await this.initializeTables();

    if (this.isDefaultDataImportDisabled()) {
      console.log(
        "Default data import is disabled (DISABLE_DEFAULT_DATA_IMPORT). Skipping seed data load.",
      );
      return;
    }

    await this.loadSeedData();
    await this.populateMainTables();
  }

  private isDefaultDataImportDisabled(): boolean {
    const raw = process.env.DISABLE_DEFAULT_DATA_IMPORT ?? "false";
    const normalized = raw.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }

  private async initializeTables() {
    await this.pool.query(DDL);
    console.log("Database tables initialized");
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await this.pool.query(sql, params);
  }

  private seedRowToColumns(
    record: Record<string, unknown>,
    tableName: string,
  ): { columns: string[]; values: unknown[] } {
    const map = COLUMN_MAP[tableName] ?? {};
    const columns: string[] = ["id"];
    const values: unknown[] = [(record["_key"] as string) ?? randomUUID()];

    for (const [jsonKey, colName] of Object.entries(map)) {
      if (record[jsonKey] !== undefined) {
        columns.push(colName);
        values.push(record[jsonKey]);
      }
    }

    return { columns, values };
  }

  private async loadSeedData() {
    const defaultDir = path.join(process.cwd(), "db-init", "default");

    const files = fs
      .readdirSync(defaultDir)
      .filter((f: string) => /^\d{4}-.+\.json$/.test(f))
      .sort();

    for (const filename of files) {
      const baseName = filename.replace(/^\d{4}-/, "").replace(/\.json$/, "");
      const mapping = SEED_TABLE_MAP[baseName];

      if (!mapping) {
        console.warn(`No table mapping for seed file: ${filename} — skipping`);
        continue;
      }

      const tableName = mapping.defaultTable;

      try {
        const countResult = await this.pool.query(
          `SELECT COUNT(*) FROM ${tableName}`,
        );
        if (parseInt(countResult.rows[0].count, 10) > 0) continue;

        const filePath = path.join(defaultDir, filename);
        const raw: Record<string, unknown>[] = JSON.parse(
          fs.readFileSync(filePath, "utf8"),
        );

        const now = new Date().toISOString();
        for (const record of raw) {
          if (!record.createdAt) record.createdAt = now;
          const { columns, values } = this.seedRowToColumns(record, tableName);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
          await this.pool.query(
            `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
            values,
          );
        }

        console.log(
          `Loaded ${raw.length} records into ${tableName} from ${filename}`,
        );
      } catch (error) {
        console.error(`Error loading seed data from ${filename}:`, error);
        throw error;
      }
    }
  }

  private async populateMainTables() {
    const mappings = [
      { main: "film_formats", default: "film_formats_default" },
      { main: "stocks", default: "stocks_default" },
      { main: "tags", default: "tags_default" },
      { main: "stock_tags", default: "stock_tags_default" },
    ];

    for (const { main, default: def } of mappings) {
      try {
        const countResult = await this.pool.query(
          `SELECT COUNT(*) FROM ${main}`,
        );
        if (parseInt(countResult.rows[0].count, 10) > 0) continue;

        await this.pool.query(
          `INSERT INTO ${main} SELECT * FROM ${def} ON CONFLICT (id) DO NOTHING`,
        );

        const inserted = await this.pool.query(`SELECT COUNT(*) FROM ${main}`);
        console.log(
          `Populated ${main} with ${inserted.rows[0].count} records from ${def}`,
        );
      } catch (error) {
        console.error(`Error populating table ${main}:`, error);
      }
    }
  }
}

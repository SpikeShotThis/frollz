import { Injectable, Inject, OnModuleInit, Logger } from "@nestjs/common";
import { Knex } from "knex";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

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

// Maps camelCase JSON field names to snake_case postgres column names per table.
// Each entry is shared between the main table and its _default shadow table.
const BASE_COLUMN_MAP: Record<string, Record<string, string>> = {
  film_formats: {
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
  tags: {
    value: "value",
    color: "color",
    isRollScoped: "is_roll_scoped",
    isStockScoped: "is_stock_scoped",
    isSystem: "is_system",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  stock_tags: {
    stockKey: "stock_key",
    tagKey: "tag_key",
    createdAt: "created_at",
  },
};

const COLUMN_MAP: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(BASE_COLUMN_MAP).flatMap(([table, cols]) => [
    [table, cols],
    [`${table}_default`, cols],
  ]),
);

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject("KNEX_CONNECTION") private readonly knex: Knex) {}

  async onModuleInit() {
    await this.knex.migrate.latest();
    this.logger.log("Database migrations applied");

    if (this.isDefaultDataImportDisabled()) {
      this.logger.log(
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

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.knex.raw(sql, params ?? []);
    return result.rows as T[];
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await this.knex.raw(sql, params ?? []);
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
        this.logger.warn(
          `No table mapping for seed file: ${filename} — skipping`,
        );
        continue;
      }

      const tableName = mapping.defaultTable;

      try {
        const countResult = await this.knex.raw(
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
          const placeholders = values.map(() => "?").join(", ");
          await this.knex.raw(
            `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
            values,
          );
        }

        this.logger.log(
          `Loaded ${raw.length} records into ${tableName} from ${filename}`,
        );
      } catch (error) {
        this.logger.error(`Error loading seed data from ${filename}:`, error);
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
        const countResult = await this.knex.raw(`SELECT COUNT(*) FROM ${main}`);
        if (parseInt(countResult.rows[0].count, 10) > 0) continue;

        await this.knex.raw(
          `INSERT INTO ${main} SELECT * FROM ${def} ON CONFLICT (id) DO NOTHING`,
        );

        const inserted = await this.knex.raw(`SELECT COUNT(*) FROM ${main}`);
        this.logger.log(
          `Populated ${main} with ${inserted.rows[0].count} records from ${def}`,
        );
      } catch (error) {
        this.logger.error(`Error populating table ${main}:`, error);
      }
    }
  }
}

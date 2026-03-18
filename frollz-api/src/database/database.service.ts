import { Injectable, Inject, OnModuleInit, Logger } from "@nestjs/common";
import { Knex } from "knex";

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject("KNEX_CONNECTION") private readonly knex: Knex) {}

  async onModuleInit() {
    await this.knex.migrate.latest();
    this.logger.log("Database migrations applied");

    // System tags always flow into main tables — they are required for
    // auto-tagging to function regardless of the convenience data flag.
    await this.populateSystemTags();

    if (this.isDefaultDataImportDisabled()) {
      this.logger.log(
        "Default data import is disabled (DISABLE_DEFAULT_DATA_IMPORT). Skipping convenience data population.",
      );
      return;
    }

    await this.populateMainTables();
  }

  private isDefaultDataImportDisabled(): boolean {
    const raw = process.env.DISABLE_DEFAULT_DATA_IMPORT ?? "false";
    return ["true", "1"].includes(raw.trim().toLowerCase());
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.knex.raw(sql, params ?? []);
    return result.rows as T[];
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    await this.knex.raw(sql, params ?? []);
  }

  private async populateSystemTags(): Promise<void> {
    try {
      await this.knex.raw(
        `INSERT INTO tags (id, value, color, is_roll_scoped, is_stock_scoped, is_system, created_at)
         SELECT id, value, color, is_roll_scoped, is_stock_scoped, is_system, created_at
         FROM tags_default
         WHERE is_system = true
         ON CONFLICT (id) DO NOTHING`,
      );
      this.logger.log("System tags synced to main tags table");
    } catch (error) {
      this.logger.error("Error syncing system tags:", error);
      throw error;
    }
  }

  private async populateMainTables(): Promise<void> {
    const mappings = [
      { main: "film_formats", default: "film_formats_default" },
      { main: "stocks", default: "stocks_default" },
      { main: "tags", default: "tags_default" },
      { main: "stock_tags", default: "stock_tags_default" },
    ];

    for (const { main, default: def } of mappings) {
      try {
        await this.knex.raw(
          `INSERT INTO ${main} SELECT * FROM ${def} ON CONFLICT (id) DO NOTHING`,
        );
        this.logger.log(`Populated ${main} from ${def}`);
      } catch (error) {
        this.logger.error(`Error populating table ${main}:`, error);
        throw error;
      }
    }
  }
}

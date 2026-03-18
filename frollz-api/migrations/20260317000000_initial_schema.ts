import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("film_formats"))) {
    await knex.schema.createTable("film_formats", (table) => {
      table.text("id").primary();
      table.text("form_factor").notNullable();
      table.text("format").notNullable();
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true });
    });
  }

  if (!(await knex.schema.hasTable("film_formats_default"))) {
    await knex.schema.createTable("film_formats_default", (table) => {
      table.text("id").primary();
      table.text("form_factor").notNullable();
      table.text("format").notNullable();
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true });
    });
  }

  if (!(await knex.schema.hasTable("tags"))) {
    await knex.schema.createTable("tags", (table) => {
      table.text("id").primary();
      table.text("value").notNullable();
      table.text("color").notNullable();
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable("tags_default"))) {
    await knex.schema.createTable("tags_default", (table) => {
      table.text("id").primary();
      table.text("value").notNullable();
      table.text("color").notNullable();
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable("stocks"))) {
    await knex.schema.createTable("stocks", (table) => {
      table.text("id").primary();
      table.text("format_key").references("id").inTable("film_formats");
      table.text("process").notNullable();
      table.text("manufacturer").notNullable();
      table.text("brand").notNullable();
      table.text("base_stock_key").references("id").inTable("stocks");
      table.integer("speed").notNullable();
      table.text("box_image_url");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true });
    });
  }

  if (!(await knex.schema.hasTable("stocks_default"))) {
    await knex.schema.createTable("stocks_default", (table) => {
      table.text("id").primary();
      table.text("format_key").references("id").inTable("film_formats_default");
      table.text("process").notNullable();
      table.text("manufacturer").notNullable();
      table.text("brand").notNullable();
      table.text("base_stock_key").references("id").inTable("stocks_default");
      table.integer("speed").notNullable();
      table.text("box_image_url");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true });
    });
  }

  if (!(await knex.schema.hasTable("stock_tags"))) {
    await knex.schema.createTable("stock_tags", (table) => {
      table.text("id").primary();
      table.text("stock_key").notNullable().references("id").inTable("stocks");
      table.text("tag_key").notNullable().references("id").inTable("tags");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.unique(["stock_key", "tag_key"]);
    });
  }

  if (!(await knex.schema.hasTable("stock_tags_default"))) {
    await knex.schema.createTable("stock_tags_default", (table) => {
      table.text("id").primary();
      table
        .text("stock_key")
        .notNullable()
        .references("id")
        .inTable("stocks_default");
      table
        .text("tag_key")
        .notNullable()
        .references("id")
        .inTable("tags_default");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.unique(["stock_key", "tag_key"]);
    });
  }

  if (!(await knex.schema.hasTable("rolls"))) {
    await knex.schema.createTable("rolls", (table) => {
      table.text("id").primary();
      table.text("roll_id").notNullable();
      table.text("stock_key").notNullable().references("id").inTable("stocks");
      table.text("state").notNullable();
      table.text("images_url");
      table.timestamp("date_obtained", { useTz: true }).notNullable();
      table.text("obtainment_method").notNullable();
      table.text("obtained_from").notNullable();
      table.timestamp("expiration_date", { useTz: true });
      table.integer("times_exposed_to_xrays").notNullable().defaultTo(0);
      table.text("loaded_into");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true });
    });
  }

  if (!(await knex.schema.hasTable("roll_states"))) {
    await knex.schema.createTable("roll_states", (table) => {
      table.text("id").primary();
      table.text("state_id").notNullable().unique();
      table.text("roll_id").notNullable().references("id").inTable("rolls");
      table.text("state").notNullable();
      table.timestamp("date", { useTz: true }).notNullable();
      table.text("notes");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true });
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("roll_states");
  await knex.schema.dropTableIfExists("rolls");
  await knex.schema.dropTableIfExists("stock_tags_default");
  await knex.schema.dropTableIfExists("stock_tags");
  await knex.schema.dropTableIfExists("stocks_default");
  await knex.schema.dropTableIfExists("stocks");
  await knex.schema.dropTableIfExists("tags_default");
  await knex.schema.dropTableIfExists("tags");
  await knex.schema.dropTableIfExists("film_formats_default");
  await knex.schema.dropTableIfExists("film_formats");
}

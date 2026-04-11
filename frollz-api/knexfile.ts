import type { Knex } from "knex";
import * as dotenv from "dotenv";

dotenv.config();

const config: Knex.Config = {
  client: "pg",
  connection: {
    host: process.env.DATABASE_HOST ?? "localhost",
    port: parseInt(process.env.DATABASE_PORT ?? "5432"),
    database: process.env.DATABASE_NAME ?? "frollz",
    user: process.env.DATABASE_USER ?? "frollz",
    password: process.env.DATABASE_PASSWORD ?? "",
  },
  migrations: {
    directory: "./migrations",
    loadExtensions: ['.ts']
  },
};

export default config;

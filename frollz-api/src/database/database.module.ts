import { Module, Global, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { knex, Knex } from "knex";
import * as path from "path";
import { DatabaseService } from "./database.service";

const logger = new Logger("DatabaseModule");

@Global()
@Module({
  providers: [
    {
      provide: "KNEX_CONNECTION",
      useFactory: async (configService: ConfigService): Promise<Knex> => {
        const connectWithRetry = async (
          maxRetries = 5,
          delay = 2000,
        ): Promise<Knex> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const instance = knex({
                client: "pg",
                connection: {
                  host: configService.get("POSTGRES_HOST", "localhost"),
                  port: configService.get<number>("POSTGRES_PORT", 5432),
                  database: configService.get("POSTGRES_DATABASE", "frollz"),
                  user: configService.get("POSTGRES_USER", "frollz"),
                  password: configService.get("POSTGRES_PASSWORD", "frollz"),
                },
                migrations: {
                  directory: path.join(process.cwd(), "dist", "migrations"),
                  loadExtensions: [".js"],
                },
              });

              await instance.raw("SELECT 1");
              logger.log("Successfully connected to PostgreSQL");
              return instance;
            } catch (error) {
              logger.warn(
                `PostgreSQL connection attempt ${attempt}/${maxRetries} failed: ${error.message}`,
              );

              if (attempt === maxRetries) {
                throw new Error(
                  `Failed to connect to PostgreSQL after ${maxRetries} attempts: ${error.message}`,
                );
              }

              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
          throw new Error(
            `Failed to connect to PostgreSQL after ${maxRetries} attempts`,
          );
        };

        return connectWithRetry();
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: ["KNEX_CONNECTION", DatabaseService],
})
export class DatabaseModule {}

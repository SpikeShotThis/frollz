import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { DatabaseService } from "./database.service";

@Global()
@Module({
  providers: [
    {
      provide: "POSTGRES_POOL",
      useFactory: async (configService: ConfigService): Promise<Pool> => {
        const connectWithRetry = async (
          maxRetries = 5,
          delay = 2000,
        ): Promise<Pool> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const pool = new Pool({
                host: configService.get("POSTGRES_HOST", "localhost"),
                port: configService.get<number>("POSTGRES_PORT", 5432),
                database: configService.get("POSTGRES_DATABASE", "frollz"),
                user: configService.get("POSTGRES_USER", "frollz"),
                password: configService.get("POSTGRES_PASSWORD", "frollz"),
              });

              await pool.query("SELECT 1");
              console.log("Successfully connected to PostgreSQL");
              return pool;
            } catch (error) {
              console.log(
                `PostgreSQL connection attempt ${attempt}/${maxRetries} failed:`,
                error.message,
              );

              if (attempt === maxRetries) {
                throw new Error(
                  `Failed to connect to PostgreSQL after ${maxRetries} attempts: ${error.message}`,
                );
              }

              await new Promise((resolve) => setTimeout(resolve, delay));
            }
          }
        };

        return connectWithRetry();
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: ["POSTGRES_POOL", DatabaseService],
})
export class DatabaseModule {}

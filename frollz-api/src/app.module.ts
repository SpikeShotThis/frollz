import { existsSync } from "fs";
import { join } from "path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ThrottleLimits } from "./common/throttle-limits";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module";
import { FilmFormatModule } from "./film-format/film-format.module";
import { StockModule } from "./stock/stock.module";
import { RollModule } from "./roll/roll.module";
import { RollStateModule } from "./roll-state/roll-state.module";
import { TagModule } from "./tag/tag.module";
import { StockTagModule } from "./stock-tag/stock-tag.module";
import { RollTagModule } from "./roll-tag/roll-tag.module";
import { TransitionModule } from "./transition/transition.module";

// Serve the Vue SPA from /app/public when running in the combined production
// container. Skipped automatically in dev (the directory won't exist).
const publicPath = join(__dirname, "..", "public");
const serveStaticModules = existsSync(publicPath)
  ? [
      ServeStaticModule.forRoot({
        rootPath: publicPath,
        exclude: ["/api/(.*)"],
      }),
    ]
  : [];

@Module({
  imports: [
    ...serveStaticModules,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([ThrottleLimits._100_REQUESTS_PER_MINUTE]),
    DatabaseModule,
    FilmFormatModule,
    StockModule,
    RollModule,
    RollStateModule,
    TagModule,
    StockTagModule,
    RollTagModule,
    TransitionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

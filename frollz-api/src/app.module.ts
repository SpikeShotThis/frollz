import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module";
import { FilmFormatModule } from "./film-format/film-format.module";
import { StockModule } from "./stock/stock.module";
import { RollModule } from "./roll/roll.module";
import { RollStateModule } from "./roll-state/roll-state.module";
import { TagModule } from "./tag/tag.module";
import { StockTagModule } from "./stock-tag/stock-tag.module";
import { RollTagModule } from "./roll-tag/roll-tag.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    FilmFormatModule,
    StockModule,
    RollModule,
    RollStateModule,
    TagModule,
    StockTagModule,
    RollTagModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

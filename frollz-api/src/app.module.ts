import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { FilmFormatModule } from './film-format/film-format.module';
import { StockModule } from './stock/stock.module';
import { RollModule } from './roll/roll.module';
import { RollStateModule } from './roll-state/roll-state.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    FilmFormatModule,
    StockModule,
    RollModule,
    RollStateModule,
  ],
})
export class AppModule {}
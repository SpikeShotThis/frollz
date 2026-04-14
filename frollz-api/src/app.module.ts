import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { SharedModule } from './modules/shared/shared.module';
import { EmulsionModule } from './modules/emulsion/emulsion.module';
import { FilmModule } from './modules/film/film.module';
import { FilmStateModule } from './modules/film-state/film-state.module';
import { TransitionModule } from './modules/transition/transition.module';
import { ExportImportModule } from './modules/export-import/export-import.module';
import { FilmStatsModule } from './modules/film-stats/film-stats.module';
import { CameraModule } from './modules/camera/camera.module';
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    DatabaseModule,
    SharedModule,
    EmulsionModule,
    FilmModule,
    FilmStateModule,
    TransitionModule,
    ExportImportModule,
    FilmStatsModule,
    CameraModule
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule { }

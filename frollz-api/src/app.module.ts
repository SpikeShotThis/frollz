import { Module } from '@nestjs/common';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { SharedModule } from './modules/shared/shared.module';
import { EmulsionModule } from './modules/emulsion/emulsion.module';
import { FilmModule } from './modules/film/film.module';
import { FilmStateModule } from './modules/film-state/film-state.module';
import { TransitionModule } from './modules/transition/transition.module';

@Module({
  imports: [DatabaseModule, SharedModule, EmulsionModule, FilmModule, FilmStateModule, TransitionModule],
})
export class AppModule {}

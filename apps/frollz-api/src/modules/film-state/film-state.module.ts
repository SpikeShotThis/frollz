import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infrastructure/persistence/database.module";
import { FILM_STATE_REPOSITORY } from "../../domain/film-state/repositories/film-state.repository.interface";
import { FilmStateKnexRepository } from "../../infrastructure/persistence/film-state/film-state.knex.repository";
import { FilmStateService } from "./application/film-state.service";
import { FilmStateController } from "./film-state.controller";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: FILM_STATE_REPOSITORY, useClass: FilmStateKnexRepository },
    FilmStateService,
  ],
  controllers: [FilmStateController],
  exports: [FILM_STATE_REPOSITORY],
})
export class FilmStateModule {}

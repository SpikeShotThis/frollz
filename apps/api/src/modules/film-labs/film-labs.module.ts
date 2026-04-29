import { Module } from '@nestjs/common';
import { FilmLabRepository } from '../../infrastructure/repositories/film-lab.repository.js';
import { MikroOrmFilmLabRepository } from '../../infrastructure/repositories/mikro-orm-film-lab.repository.js';
import { FilmLabsController } from './film-labs.controller.js';
import { FilmLabsService } from './film-labs.service.js';

@Module({
  controllers: [FilmLabsController],
  providers: [FilmLabsService, { provide: FilmLabRepository, useClass: MikroOrmFilmLabRepository }],
  exports: [FilmLabsService, FilmLabRepository]
})
export class FilmLabsModule {}

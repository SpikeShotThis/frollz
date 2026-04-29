import { Module } from '@nestjs/common';
import { FilmController } from './film.controller.js';
import { FilmService } from './film.service.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import { MikroOrmFilmRepository } from '../../infrastructure/repositories/mikro-orm-film.repository.js';
import { FilmLotRepository } from '../../infrastructure/repositories/film-lot.repository.js';
import { MikroOrmFilmLotRepository } from '../../infrastructure/repositories/mikro-orm-film-lot.repository.js';
import { FilmLabsModule } from '../film-labs/film-labs.module.js';
import { FilmSuppliersModule } from '../film-suppliers/film-suppliers.module.js';

@Module({
  imports: [FilmLabsModule, FilmSuppliersModule],
  controllers: [FilmController],
  providers: [
    FilmService,
    IdempotencyService,
    { provide: FilmRepository, useClass: MikroOrmFilmRepository },
    { provide: FilmLotRepository, useClass: MikroOrmFilmLotRepository }
  ],
  exports: [FilmService, FilmRepository, FilmLotRepository]
})
export class FilmModule { }

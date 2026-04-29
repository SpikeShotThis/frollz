import { Module } from '@nestjs/common';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { FilmSupplierRepository } from '../../infrastructure/repositories/film-supplier.repository.js';
import { MikroOrmFilmSupplierRepository } from '../../infrastructure/repositories/mikro-orm-film-supplier.repository.js';
import { FilmSuppliersController } from './film-suppliers.controller.js';
import { FilmSuppliersService } from './film-suppliers.service.js';

@Module({
  controllers: [FilmSuppliersController],
  providers: [FilmSuppliersService, IdempotencyService, { provide: FilmSupplierRepository, useClass: MikroOrmFilmSupplierRepository }],
  exports: [FilmSuppliersService, FilmSupplierRepository]
})
export class FilmSuppliersModule {}

import { Module } from '@nestjs/common';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { DeviceRepository } from '../../infrastructure/repositories/device.repository.js';
import { FilmRepository } from '../../infrastructure/repositories/film.repository.js';
import { MikroOrmDeviceRepository } from '../../infrastructure/repositories/mikro-orm-device.repository.js';
import { MikroOrmFilmRepository } from '../../infrastructure/repositories/mikro-orm-film.repository.js';

@Module({
  controllers: [DevicesController],
  providers: [
    DevicesService,
    IdempotencyService,
    { provide: DeviceRepository, useClass: MikroOrmDeviceRepository },
    { provide: FilmRepository, useClass: MikroOrmFilmRepository }
  ],
  exports: [DevicesService]
})
export class DevicesModule { }

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DevicesModule } from '../devices/devices.module.js';
import { FilmModule } from '../film/film.module.js';
import { ReferenceModule } from '../reference/reference.module.js';
import { TestController } from './test.controller.js';
import { TestFixturesService } from './test-fixtures.service.js';

@Module({
  imports: [AuthModule, DevicesModule, FilmModule, ReferenceModule],
  controllers: [TestController],
  providers: [TestFixturesService],
})
export class TestModule {}

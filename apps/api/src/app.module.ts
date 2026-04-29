import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module, RequestMethod } from '@nestjs/common';
import { MikroOrmMiddleware } from '@mikro-orm/nestjs';
import { ThrottlerModule } from '@nestjs/throttler';
import { EnvModule } from './config/env.module.js';
import { DatabaseModule } from './infrastructure/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FilmModule } from './modules/film/film.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';
import { ReferenceModule } from './modules/reference/reference.module.js';
import { TestModule } from './modules/test/test.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { HealthController } from './presentation/controllers/health.controller.js';

const conditionalModules = process.env['NODE_ENV'] === 'test' ? [TestModule] : [];

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100, skipIf: () => process.env['NODE_ENV'] === 'test' }]),
    AuthModule,
    ReferenceModule,
    FilmModule,
    DevicesModule,
    AdminModule,
    ...conditionalModules,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MikroOrmMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}

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
import { EmulsionsModule } from './modules/emulsions/emulsions.module.js';
import { TestModule } from './modules/test/test.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { FilmLabsModule } from './modules/film-labs/film-labs.module.js';
import { FilmSuppliersModule } from './modules/film-suppliers/film-suppliers.module.js';
import { InsightsModule } from './modules/insights/insights.module.js';
import { HealthController } from './presentation/controllers/health.controller.js';

const conditionalModules = process.env['NODE_ENV'] === 'test' ? [TestModule] : [];
const isDevelopment = process.env['NODE_ENV'] === 'development';
const devThrottleEnabled = process.env['API_DEV_THROTTLE_ENABLED'] === 'true';
const configuredDevLimit = Number.parseInt(process.env['API_DEV_THROTTLE_LIMIT'] ?? '1000', 10);
const resolvedDevLimit = Number.isFinite(configuredDevLimit) && configuredDevLimit > 0 ? configuredDevLimit : 1000;
const defaultThrottleLimit = isDevelopment && devThrottleEnabled ? resolvedDevLimit : 100;

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: defaultThrottleLimit, skipIf: () => process.env['NODE_ENV'] === 'test' }]),
    AuthModule,
    ReferenceModule,
    EmulsionsModule,
    FilmModule,
    DevicesModule,
    FilmLabsModule,
    FilmSuppliersModule,
    InsightsModule,
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

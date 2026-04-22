import type { MiddlewareConsumer, NestModule} from '@nestjs/common';
import { Module, RequestMethod } from '@nestjs/common';
import { MikroOrmMiddleware } from '@mikro-orm/nestjs';
import { DatabaseModule } from './infrastructure/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { FilmModule } from './modules/film/film.module.js';
import { ReceiversModule } from './modules/receivers/receivers.module.js';
import { ReferenceModule } from './modules/reference/reference.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, ReferenceModule, FilmModule, ReceiversModule]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MikroOrmMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}

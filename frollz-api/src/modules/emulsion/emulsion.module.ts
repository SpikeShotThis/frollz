import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/persistence/database.module';
import { EMULSION_REPOSITORY } from '../../domain/emulsion/repositories/emulsion.repository.interface';
import { EmulsionKnexRepository } from '../../infrastructure/persistence/emulsion/emulsion.knex.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: EMULSION_REPOSITORY,
      useClass: EmulsionKnexRepository,
    },
  ],
  exports: [EMULSION_REPOSITORY],
})
export class EmulsionModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/persistence/database.module';
import { TRANSITION_RULE_REPOSITORY } from '../../domain/transition/repositories/transition-rule.repository.interface';
import { TRANSITION_STATE_REPOSITORY } from '../../domain/transition/repositories/transition-state.repository.interface';
import { TRANSITION_PROFILE_REPOSITORY } from '../../domain/transition/repositories/transition-profile.repository.interface';
import { TRANSITION_METADATA_FIELD_REPOSITORY } from '../../domain/transition/repositories/transition-metadata-field.repository.interface';
import { TRANSITION_STATE_METADATA_REPOSITORY } from '../../domain/transition/repositories/transition-state-metadata.repository.interface';
import { TransitionRuleKnexRepository } from '../../infrastructure/persistence/transition/transition-rule.knex.repository';
import { TransitionStateKnexRepository } from '../../infrastructure/persistence/transition/transition-state.knex.repository';
import { TransitionProfileKnexRepository } from '../../infrastructure/persistence/transition/transition-profile.knex.repository';
import { TransitionMetadataFieldKnexRepository } from '../../infrastructure/persistence/transition/transition-metadata-field.knex.repository';
import { TransitionStateMetadataKnexRepository } from '../../infrastructure/persistence/transition/transition-state-metadata.knex.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: TRANSITION_RULE_REPOSITORY, useClass: TransitionRuleKnexRepository },
    { provide: TRANSITION_STATE_REPOSITORY, useClass: TransitionStateKnexRepository },
    { provide: TRANSITION_PROFILE_REPOSITORY, useClass: TransitionProfileKnexRepository },
    { provide: TRANSITION_METADATA_FIELD_REPOSITORY, useClass: TransitionMetadataFieldKnexRepository },
    { provide: TRANSITION_STATE_METADATA_REPOSITORY, useClass: TransitionStateMetadataKnexRepository },
  ],
  exports: [
    TRANSITION_RULE_REPOSITORY,
    TRANSITION_STATE_REPOSITORY,
    TRANSITION_PROFILE_REPOSITORY,
    TRANSITION_METADATA_FIELD_REPOSITORY,
    TRANSITION_STATE_METADATA_REPOSITORY,
  ],
})
export class TransitionModule {}

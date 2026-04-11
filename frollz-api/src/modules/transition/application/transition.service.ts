import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ITransitionRuleRepository, TRANSITION_RULE_REPOSITORY } from '../../../domain/transition/repositories/transition-rule.repository.interface';
import { ITransitionStateRepository, TRANSITION_STATE_REPOSITORY } from '../../../domain/transition/repositories/transition-state.repository.interface';
import { ITransitionProfileRepository, TRANSITION_PROFILE_REPOSITORY } from '../../../domain/transition/repositories/transition-profile.repository.interface';
import { ITransitionMetadataFieldRepository, TRANSITION_METADATA_FIELD_REPOSITORY } from '../../../domain/transition/repositories/transition-metadata-field.repository.interface';
import { TransitionState } from '../../../domain/transition/entities/transition-state.entity';
import { TransitionStateMetadata } from '../../../domain/transition/entities/transition-state-metadata.entity';

export interface TransitionMetadataFieldResponse {
  field: string;
  fieldType: string;
  defaultValue: string | null;
  isRequired: boolean;
}

export interface TransitionEdgeResponse {
  id: number;
  fromState: string;
  toState: string;
  metadata: TransitionMetadataFieldResponse[];
}

export interface TransitionGraphResponse {
  states: string[];
  transitions: TransitionEdgeResponse[];
}

@Injectable()
export class TransitionService {
  constructor(
    @Inject(TRANSITION_RULE_REPOSITORY) private readonly ruleRepo: ITransitionRuleRepository,
    @Inject(TRANSITION_STATE_REPOSITORY) private readonly stateRepo: ITransitionStateRepository,
    @Inject(TRANSITION_PROFILE_REPOSITORY) private readonly profileRepo: ITransitionProfileRepository,
    @Inject(TRANSITION_METADATA_FIELD_REPOSITORY) private readonly metadataFieldRepo: ITransitionMetadataFieldRepository,
  ) {}

  async listProfiles(): Promise<{ id: number; name: string }[]> {
    const profiles = await this.profileRepo.findAll();
    return profiles.map((p) => ({ id: p.id, name: p.name }));
  }

  async getGraph(profileName = 'standard'): Promise<TransitionGraphResponse> {
    const profile = await this.profileRepo.findByName(profileName);
    if (!profile) throw new NotFoundException(`Transition profile '${profileName}' not found`);

    const [rules, allStates] = await Promise.all([
      this.ruleRepo.findByprofileId(profile.id),
      this.stateRepo.findAll(),
    ]);

    const stateMap = new Map(allStates.map((s) => [s.id, s]));

    const transitions = await Promise.all(
      rules.map(async (rule) => {
        const fromState = stateMap.get(rule.fromStateId);
        const toState = stateMap.get(rule.toStateId);
        const metadata = toState ? await this.resolveMetadata(toState) : [];
        return {
          id: rule.id,
          fromState: fromState?.name ?? '',
          toState: toState?.name ?? '',
          metadata,
        };
      }),
    );

    const stateNames = [
      ...new Set([
        ...transitions.map((t) => t.fromState),
        ...transitions.map((t) => t.toState),
      ]),
    ].sort();

    return { states: stateNames, transitions };
  }

  private async resolveMetadata(state: TransitionState): Promise<TransitionMetadataFieldResponse[]> {
    return Promise.all(
      state.metadata.map(async (m: TransitionStateMetadata) => {
        const field = await this.metadataFieldRepo.findById(m.fieldId);
        return {
          field: field!.name,
        fieldType: field!.fieldType ?? 'string',
          defaultValue: m.defaultValue,
          isRequired: true,
        };
      }),
    );
  }
}

import { randomInt } from 'crypto';
import { NotFoundException } from '@nestjs/common';
import { TransitionService } from './transition.service';
import { ITransitionRuleRepository } from '../../../domain/transition/repositories/transition-rule.repository.interface';
import { ITransitionStateRepository } from '../../../domain/transition/repositories/transition-state.repository.interface';
import { ITransitionProfileRepository } from '../../../domain/transition/repositories/transition-profile.repository.interface';
import { ITransitionMetadataFieldRepository } from '../../../domain/transition/repositories/transition-metadata-field.repository.interface';
import { TransitionProfile } from '../../../domain/transition/entities/transition-profile.entity';
import { TransitionState } from '../../../domain/transition/entities/transition-state.entity';
import { TransitionRule } from '../../../domain/transition/entities/transition-rule.entity';
import { TransitionMetadataField } from '../../../domain/transition/entities/transition-metadata-field.entity';
import { TransitionStateMetadata } from '../../../domain/transition/entities/transition-state-metadata.entity';

const randomId = () => randomInt(1, 1000000);

const makeProfile = (name = 'standard'): TransitionProfile =>
  TransitionProfile.create({ id: randomId(), name });

const makeState = (name: string, metadata: TransitionStateMetadata[] = []): TransitionState =>
  TransitionState.create({ id: randomId(), name, metadata });

const makeRule = (fromStateId: number, toStateId: number, profileId: number): TransitionRule =>
  TransitionRule.create({ id: randomId(), fromStateId, toStateId, profileId });

const makeField = (): TransitionMetadataField =>
  TransitionMetadataField.create({ id: randomId(), name: 'lab_name', fieldType: 'string' });

const makeProfileRepo = (overrides: Partial<ITransitionProfileRepository> = {}): ITransitionProfileRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeRuleRepo = (overrides: Partial<ITransitionRuleRepository> = {}): ITransitionRuleRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByProfileId: jest.fn().mockResolvedValue([]),
  findByFromStateId: jest.fn().mockResolvedValue([]),
  findByFromStateAndProfile: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeStateRepo = (overrides: Partial<ITransitionStateRepository> = {}): ITransitionStateRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeFieldRepo = (overrides: Partial<ITransitionMetadataFieldRepository> = {}): ITransitionMetadataFieldRepository => ({
  findAll: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
  findByName: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeService = (
  ruleRepo: ITransitionRuleRepository = makeRuleRepo(),
  stateRepo: ITransitionStateRepository = makeStateRepo(),
  profileRepo: ITransitionProfileRepository = makeProfileRepo(),
  fieldRepo: ITransitionMetadataFieldRepository = makeFieldRepo(),
) => new TransitionService(ruleRepo, stateRepo, profileRepo, fieldRepo);

describe('TransitionService', () => {
  describe('getGraph', () => {
    it('throws NotFoundException when profile does not exist', async () => {
      const service = makeService();

      await expect(service.getGraph('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns states and transitions for the profile', async () => {
      const profile = makeProfile('standard');
      const added = makeState('Added');
      const loaded = makeState('Loaded');
      const rule = makeRule(added.id, loaded.id, profile.id);

      const service = makeService(
        makeRuleRepo({ findByProfileId: jest.fn().mockResolvedValue([rule]) }),
        makeStateRepo({ findAll: jest.fn().mockResolvedValue([added, loaded]) }),
        makeProfileRepo({ findByName: jest.fn().mockResolvedValue(profile) }),
      );

      const graph = await service.getGraph('standard');

      expect(graph.states).toContain('Added');
      expect(graph.states).toContain('Loaded');
      expect(graph.transitions).toHaveLength(1);
      expect(graph.transitions[0]).toMatchObject({
        id: rule.id,
        fromState: 'Added',
        toState: 'Loaded',
        metadata: [],
      });
    });

    it('resolves metadata fields on the destination state', async () => {
      const profile = makeProfile('standard');
      const field = makeField();
      const stateMetadata = TransitionStateMetadata.create({
        id: randomId(),
        fieldId: field.id,
        transitionStateId: randomId(),
        defaultValue: 'default-lab',
      });
      const added = makeState('Added');
      const sent = makeState('Sent For Development', [stateMetadata]);
      const rule = makeRule(added.id, sent.id, profile.id);

      const service = makeService(
        makeRuleRepo({ findByProfileId: jest.fn().mockResolvedValue([rule]) }),
        makeStateRepo({ findAll: jest.fn().mockResolvedValue([added, sent]) }),
        makeProfileRepo({ findByName: jest.fn().mockResolvedValue(profile) }),
        makeFieldRepo({ findById: jest.fn().mockResolvedValue(field) }),
      );

      const graph = await service.getGraph('standard');
      const edge = graph.transitions[0];

      expect(edge.metadata).toHaveLength(1);
      expect(edge.metadata[0]).toMatchObject({
        field: 'lab_name',
        fieldType: 'string',
        defaultValue: 'default-lab',
        isRequired: true,
      });
    });
  });
});

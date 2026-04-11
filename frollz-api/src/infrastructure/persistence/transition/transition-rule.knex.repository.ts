import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TransitionRule } from '../../../domain/transition/entities/transition-rule.entity';
import { ITransitionRuleRepository } from '../../../domain/transition/repositories/transition-rule.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { TransitionRuleRow } from '../types/db.types';
import { TransitionRuleMapper } from './transition-rule.mapper';

@Injectable()
export class TransitionRuleKnexRepository implements ITransitionRuleRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<TransitionRule | null> {
    const row = await this.knex<TransitionRuleRow>('transition_rule').where({ id }).first();
    if (!row) return null;
    return TransitionRuleMapper.toDomain(row);
  }

  async findAll(): Promise<TransitionRule[]> {
    const rows = await this.knex<TransitionRuleRow>('transition_rule').select('*');
    return rows.map((row) => TransitionRuleMapper.toDomain(row));
  }

  async findByProfileId(profileId: number): Promise<TransitionRule[]> {
    const rows = await this.knex<TransitionRuleRow>('transition_rule').where({ profile_id: profileId });
    return rows.map((row) => TransitionRuleMapper.toDomain(row));
  }

  async findByFromStateId(fromStateId: number): Promise<TransitionRule[]> {
    const rows = await this.knex<TransitionRuleRow>('transition_rule').where({ from_state_id: fromStateId });
    return rows.map((row) => TransitionRuleMapper.toDomain(row));
  }

  async findByFromStateAndProfile(fromStateId: number, profileId: number): Promise<TransitionRule[]> {
    const rows = await this.knex<TransitionRuleRow>('transition_rule').where({ from_state_id: fromStateId, profile_id: profileId });
    return rows.map((row) => TransitionRuleMapper.toDomain(row));
  }

  async save(rule: TransitionRule): Promise<void> {
    await this.knex('transition_rule').insert(TransitionRuleMapper.toPersistence(rule));
  }

  async update(rule: TransitionRule): Promise<void> {
    const { id, ...data } = TransitionRuleMapper.toPersistence(rule);
    await this.knex('transition_rule').where({ id }).update(data);
  }

  async delete(id: number): Promise<void> {
    await this.knex('transition_rule').where({ id }).delete();
  }
}

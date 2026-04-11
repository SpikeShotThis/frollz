import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { TransitionProfile } from '../../../domain/transition/entities/transition-profile.entity';
import { ITransitionProfileRepository } from '../../../domain/transition/repositories/transition-profile.repository.interface';
import { KNEX_CONNECTION } from '../knex.provider';
import { TransitionProfileRow } from '../types/db.types';

@Injectable()
export class TransitionProfileKnexRepository implements ITransitionProfileRepository {
  constructor(@Inject(KNEX_CONNECTION) private readonly knex: Knex) {}

  async findById(id: number): Promise<TransitionProfile | null> {
    const row = await this.knex<TransitionProfileRow>('transition_profile').where({ id }).first();
    return row ? TransitionProfile.create({ id: row.id.trim(), name: row.name }) : null;
  }

  async findAll(): Promise<TransitionProfile[]> {
    const rows = await this.knex<TransitionProfileRow>('transition_profile').select('*').orderBy('name');
    return rows.map((r) => TransitionProfile.create({ id: r.id.trim(), name: r.name }));
  }

  async findByName(name: string): Promise<TransitionProfile | null> {
    const row = await this.knex<TransitionProfileRow>('transition_profile').where({ name }).first();
    return row ? TransitionProfile.create({ id: row.id.trim(), name: row.name }) : null;
  }

  async save(profile: TransitionProfile): Promise<void> {
    await this.knex('transition_profile').insert({ id: profile.id, name: profile.name });
  }

  async update(profile: TransitionProfile): Promise<void> {
    await this.knex('transition_profile').where({ id: profile.id }).update({ name: profile.name });
  }

  async delete(id: number): Promise<void> {
    await this.knex('transition_profile').where({ id }).delete();
  }
}

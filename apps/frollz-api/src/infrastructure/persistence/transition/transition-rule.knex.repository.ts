import { Injectable } from "@nestjs/common";
import { TransitionRule } from "../../../domain/transition/entities/transition-rule.entity";
import { ITransitionRuleRepository } from "../../../domain/transition/repositories/transition-rule.repository.interface";
import { TransitionRuleRow } from "../types/db.types";
import { TransitionRuleMapper } from "./transition-rule.mapper";
import { BaseKnexRepository } from "../base.knex.repository";

@Injectable()
export class TransitionRuleKnexRepository
  extends BaseKnexRepository
  implements ITransitionRuleRepository
{
  async findById(id: number): Promise<TransitionRule | null> {
    const row = await this.db<TransitionRuleRow>("transition_rule")
      .where({ id })
      .first();
    if (!row) return null;
    return TransitionRuleMapper.toDomain(row);
  }

  async findAll(): Promise<TransitionRule[]> {
    const rows =
      await this.db<TransitionRuleRow>("transition_rule").select("*");
    return rows.map((row) => TransitionRuleMapper.toDomain(row));
  }

  async findByProfileId(profileId: number): Promise<TransitionRule[]> {
    const rows = await this.db<TransitionRuleRow>("transition_rule").where({
      profile_id: profileId,
    });
    return rows.map((row) => TransitionRuleMapper.toDomain(row));
  }

  async findByFromStateId(fromStateId: number): Promise<TransitionRule[]> {
    const rows = await this.db<TransitionRuleRow>("transition_rule").where({
      from_state_id: fromStateId,
    });
    return rows.map((row) => TransitionRuleMapper.toDomain(row));
  }

  async findByFromStateAndProfile(
    fromStateId: number,
    profileId: number,
  ): Promise<TransitionRule[]> {
    const rows = await this.db<TransitionRuleRow>("transition_rule").where({
      from_state_id: fromStateId,
      profile_id: profileId,
    });
    return rows.map((row) => TransitionRuleMapper.toDomain(row));
  }

  async save(rule: TransitionRule): Promise<void> {
    await this.db("transition_rule").insert(
      TransitionRuleMapper.toPersistence(rule),
    );
  }

  async update(rule: TransitionRule): Promise<void> {
    const { id, ...data } = TransitionRuleMapper.toPersistence(rule);
    await this.db("transition_rule").where({ id }).update(data);
  }

  async delete(id: number): Promise<void> {
    await this.db("transition_rule").where({ id }).delete();
  }
}

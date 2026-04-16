import { Injectable } from "@nestjs/common";
import { TransitionStateMetadata } from "../../../domain/transition/entities/transition-state-metadata.entity";
import { ITransitionStateMetadataRepository } from "../../../domain/transition/repositories/transition-state-metadata.repository.interface";
import { TransitionStateMetadataRow } from "../types/db.types";
import { BaseKnexRepository } from "../base.knex.repository";
import { TransitionStateMetadataMapper } from "./transition-state-metadata.mapper";

@Injectable()
export class TransitionStateMetadataKnexRepository
  extends BaseKnexRepository
  implements ITransitionStateMetadataRepository
{
  async findById(id: number): Promise<TransitionStateMetadata | null> {
    const row = await this.db<TransitionStateMetadataRow>(
      "transition_state_metadata",
    )
      .where({ id })
      .first();
    return row ? TransitionStateMetadataMapper.toDomain(row) : null;
  }

  async findAll(): Promise<TransitionStateMetadata[]> {
    const rows = await this.db<TransitionStateMetadataRow>(
      "transition_state_metadata",
    ).select("*");
    return rows.map((r) => TransitionStateMetadataMapper.toDomain(r));
  }

  async findByTransitionStateId(
    transitionStateId: number,
  ): Promise<TransitionStateMetadata[]> {
    const rows = await this.db<TransitionStateMetadataRow>(
      "transition_state_metadata",
    ).where({
      transition_state_id: transitionStateId,
    });
    return rows.map((r) => TransitionStateMetadataMapper.toDomain(r));
  }

  async save(metadata: TransitionStateMetadata): Promise<void> {
    await this.db("transition_state_metadata").insert({
      id: metadata.id,
      field_id: metadata.fieldId,
      transition_state_id: metadata.transitionStateId,
      default_value: metadata.defaultValue,
    });
  }

  async update(metadata: TransitionStateMetadata): Promise<void> {
    await this.db("transition_state_metadata")
      .where({ id: metadata.id })
      .update({
        field_id: metadata.fieldId,
        transition_state_id: metadata.transitionStateId,
        default_value: metadata.defaultValue,
      });
  }

  async delete(id: number): Promise<void> {
    await this.db("transition_state_metadata").where({ id }).delete();
  }
}

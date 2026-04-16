import { Injectable } from "@nestjs/common";
import { TransitionMetadataField } from "../../../domain/transition/entities/transition-metadata-field.entity";
import { ITransitionMetadataFieldRepository } from "../../../domain/transition/repositories/transition-metadata-field.repository.interface";
import { TransitionMetadataFieldRow } from "../types/db.types";
import { BaseKnexRepository } from "../base.knex.repository";
import { TransitionMetadataFieldMapper } from "./transition-metadata-field.mapper";

@Injectable()
export class TransitionMetadataFieldKnexRepository
  extends BaseKnexRepository
  implements ITransitionMetadataFieldRepository
{
  async findById(id: number): Promise<TransitionMetadataField | null> {
    const row = await this.db<TransitionMetadataFieldRow>(
      "transition_metadata_field",
    )
      .where({ id })
      .first();
    return row ? TransitionMetadataFieldMapper.toDomain(row) : null;
  }

  async findAll(): Promise<TransitionMetadataField[]> {
    const rows = await this.db<TransitionMetadataFieldRow>(
      "transition_metadata_field",
    )
      .select("*")
      .orderBy("name");
    return rows.map((r) => TransitionMetadataFieldMapper.toDomain(r));
  }

  async findByName(name: string): Promise<TransitionMetadataField | null> {
    const row = await this.db<TransitionMetadataFieldRow>(
      "transition_metadata_field",
    )
      .where({ name })
      .first();
    return row ? TransitionMetadataFieldMapper.toDomain(row) : null;
  }

  async save(field: TransitionMetadataField): Promise<void> {
    await this.db("transition_metadata_field").insert({
      id: field.id,
      name: field.name,
      field_type: field.fieldType,
      allow_multiple: field.allowMultiple,
    });
  }

  async update(field: TransitionMetadataField): Promise<void> {
    await this.db("transition_metadata_field").where({ id: field.id }).update({
      name: field.name,
      field_type: field.fieldType,
      allow_multiple: field.allowMultiple,
    });
  }

  async delete(id: number): Promise<void> {
    await this.db("transition_metadata_field").where({ id }).delete();
  }
}

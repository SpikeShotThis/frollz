import { Injectable } from "@nestjs/common";
import { IEmulsionTagRepository } from "../../../domain/emulsion-tag/repositories/emulsion-tag.repository.interface";
import { BaseKnexRepository } from "../base.knex.repository";

@Injectable()
export class EmulsionTagKnexRepository
  extends BaseKnexRepository
  implements IEmulsionTagRepository
{
  async add(emulsionId: number, tagId: number): Promise<void> {
    await this.db("emulsion_tag").insert({
      emulsion_id: emulsionId,
      tag_id: tagId,
    });
  }

  async remove(emulsionId: number, tagId: number): Promise<void> {
    await this.db("emulsion_tag")
      .where({ emulsion_id: emulsionId, tag_id: tagId })
      .delete();
  }
}

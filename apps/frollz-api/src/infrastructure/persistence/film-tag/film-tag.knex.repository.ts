import { Injectable } from "@nestjs/common";
import { IFilmTagRepository } from "../../../domain/film-tag/repositories/film-tag.repository.interface";
import { BaseKnexRepository } from "../base.knex.repository";

@Injectable()
export class FilmTagKnexRepository
  extends BaseKnexRepository
  implements IFilmTagRepository
{
  async add(filmId: number, tagId: number): Promise<void> {
    await this.db("film_tag").insert({ film_id: filmId, tag_id: tagId });
  }

  async remove(filmId: number, tagId: number): Promise<void> {
    await this.db("film_tag")
      .where({ film_id: filmId, tag_id: tagId })
      .delete();
  }
}

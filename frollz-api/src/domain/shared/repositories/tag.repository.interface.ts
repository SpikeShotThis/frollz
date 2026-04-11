import { Tag } from '../entities/tag.entity';

export const TAG_REPOSITORY = 'TAG_REPOSITORY';

export interface ITagRepository {
  findById(id: number): Promise<Tag | null>;
  findAll(): Promise<Tag[]>;
  findByName(name: string): Promise<Tag | null>;
  save(tag: Tag): Promise<number>;
  update(tag: Tag): Promise<void>;
  delete(id: number): Promise<void>;
}

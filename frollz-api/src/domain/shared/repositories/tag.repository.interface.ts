import { Tag } from '../entities/tag.entity';

export const TAG_REPOSITORY = 'TAG_REPOSITORY';

export interface ITagRepository {
  findById(id: string): Promise<Tag | null>;
  findAll(): Promise<Tag[]>;
  findByName(name: string): Promise<Tag | null>;
  save(tag: Tag): Promise<void>;
  update(tag: Tag): Promise<void>;
  delete(id: string): Promise<void>;
}

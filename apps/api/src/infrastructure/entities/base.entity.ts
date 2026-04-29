import { PrimaryKey } from '@mikro-orm/decorators/legacy';

export abstract class AutoIncrementEntity {
  @PrimaryKey({ type: 'integer' })
  id!: number;
}

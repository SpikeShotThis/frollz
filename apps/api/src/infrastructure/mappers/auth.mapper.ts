import type { CurrentUser } from '@frollz2/schema';
import type { UserEntity } from '../entities/index.js';

export function mapCurrentUserEntity(entity: UserEntity): CurrentUser {
  return {
    id: entity.id,
    email: entity.email,
    name: entity.name,
    createdAt: entity.createdAt
  };
}

import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { AuthRepository } from './auth.repository.js';
import { RefreshTokenEntity, UserEntity } from '../entities/index.js';
import { mapCurrentUserEntity } from '../mappers/index.js';

@Injectable()
export class MikroOrmAuthRepository extends AuthRepository {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {
    super();
  }

  async findCurrentUserById(userId: number) {
    const entity = await this.entityManager.findOne(UserEntity, { id: userId });

    return entity ? mapCurrentUserEntity(entity) : null;
  }

  async findUserByEmail(email: string) {
    const entity = await this.entityManager.findOne(UserEntity, { email });

    return entity
      ? {
        ...mapCurrentUserEntity(entity),
        passwordHash: entity.passwordHash
      }
      : null;
  }

  async findUserById(userId: number) {
    const entity = await this.entityManager.findOne(UserEntity, { id: userId });

    return entity
      ? {
        ...mapCurrentUserEntity(entity),
        passwordHash: entity.passwordHash
      }
      : null;
  }

  async createUser(input: { email: string; name: string; passwordHash: string; createdAt: string }) {
    const entity = this.entityManager.create(UserEntity, {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      createdAt: input.createdAt
    });

    this.entityManager.persist(entity);
    await this.entityManager.flush();

    return mapCurrentUserEntity(entity);
  }

  async upsertRefreshToken(input: { userId: number; tokenHash: string; createdAt: string; expiresAt: string }) {
    await this.entityManager.transactional(async (transactionalEntityManager) => {
      await transactionalEntityManager.nativeDelete(RefreshTokenEntity, { user: input.userId });
      const user = transactionalEntityManager.getReference(UserEntity, input.userId);
      const entity = transactionalEntityManager.create(RefreshTokenEntity, {
        user,
        tokenHash: input.tokenHash,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt
      });

      transactionalEntityManager.persist(entity);
      await transactionalEntityManager.flush();
    });
  }

  async deleteRefreshToken(tokenHash: string, userId: number) {
    await this.entityManager.nativeDelete(RefreshTokenEntity, { tokenHash, user: userId });
  }

  async rotateRefreshToken(input: { userId: number; oldTokenHash: string; newTokenHash: string; createdAt: string; expiresAt: string }) {
    await this.entityManager.transactional(async (transactionalEntityManager) => {
      await transactionalEntityManager.nativeDelete(RefreshTokenEntity, { user: input.userId, tokenHash: input.oldTokenHash });
      const user = transactionalEntityManager.getReference(UserEntity, input.userId);
      const entity = transactionalEntityManager.create(RefreshTokenEntity, {
        user,
        tokenHash: input.newTokenHash,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt
      });
      transactionalEntityManager.persist(entity);
      await transactionalEntityManager.flush();
    });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    const entity = await this.entityManager.findOne(RefreshTokenEntity, { tokenHash }, { populate: ['user'] });

    return entity
      ? {
        userId: entity.user.id,
        tokenHash: entity.tokenHash,
        expiresAt: entity.expiresAt
      }
      : null;
  }
}

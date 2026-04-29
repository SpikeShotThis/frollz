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

  async createRefreshToken(input: { userId: number; tokenHash: string; createdAt: string; expiresAt: string }) {
    await this.entityManager.transactional(async (tx) => {
      const user = tx.getReference(UserEntity, input.userId);
      const entity = tx.create(RefreshTokenEntity, {
        user,
        tokenHash: input.tokenHash,
        previousTokenHash: null,
        previousTokenGraceUntil: null,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
        revokedAt: null
      });
      tx.persist(entity);
      await tx.flush();

      // Prune sessions beyond 10 most recent for this user to prevent unbounded growth
      const sessions = await tx.find(
        RefreshTokenEntity,
        { user: input.userId },
        { orderBy: { createdAt: 'desc' }, limit: 100 }
      );
      if (sessions.length > 10) {
        const toDelete = sessions.slice(10);
        await tx.nativeDelete(RefreshTokenEntity, { id: { $in: toDelete.map((s) => s.id) } });
      }
    });
  }

  async deleteRefreshToken(tokenHash: string, userId: number) {
    await this.entityManager.nativeDelete(RefreshTokenEntity, {
      user: userId,
      $or: [{ tokenHash }, { previousTokenHash: tokenHash }]
    });
  }

  async rotateRefreshToken(input: {
    userId: number;
    oldTokenHash: string;
    newTokenHash: string;
    previousTokenGraceUntil: string;
    createdAt: string;
    expiresAt: string;
  }) {
    const updatedRows = await this.entityManager.nativeUpdate(
      RefreshTokenEntity,
      {
        user: input.userId,
        tokenHash: input.oldTokenHash,
        revokedAt: null
      },
      {
        tokenHash: input.newTokenHash,
        previousTokenHash: input.oldTokenHash,
        previousTokenGraceUntil: input.previousTokenGraceUntil,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt
      }
    );

    return updatedRows > 0;
  }

  async rotateRefreshTokenFromPrevious(input: {
    userId: number;
    previousTokenHash: string;
    currentTokenHash: string;
    newTokenHash: string;
    previousTokenGraceUntil: string;
    createdAt: string;
    expiresAt: string;
    now: string;
  }) {
    const updatedRows = await this.entityManager.nativeUpdate(
      RefreshTokenEntity,
      {
        user: input.userId,
        tokenHash: input.currentTokenHash,
        previousTokenHash: input.previousTokenHash,
        previousTokenGraceUntil: { $gt: input.now },
        revokedAt: null
      },
      {
        tokenHash: input.newTokenHash,
        previousTokenHash: input.currentTokenHash,
        previousTokenGraceUntil: input.previousTokenGraceUntil,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt
      }
    );

    return updatedRows > 0;
  }

  async revokeRefreshTokensForUser(userId: number, revokedAt: string) {
    await this.entityManager.nativeUpdate(
      RefreshTokenEntity,
      { user: userId, revokedAt: null },
      { revokedAt, previousTokenGraceUntil: null }
    );
  }

  async findRefreshTokenByHash(tokenHash: string) {
    const now = new Date().toISOString();
    const entity = await this.entityManager.findOne(
      RefreshTokenEntity,
      {
        $or: [{ tokenHash }, { previousTokenHash: tokenHash }],
        expiresAt: { $gt: now },
        revokedAt: null
      },
      { populate: ['user'] }
    );

    if (!entity) {
      return null;
    }

    return {
      userId: entity.user.id,
      tokenHash: entity.tokenHash,
      previousTokenHash: entity.previousTokenHash,
      previousTokenGraceUntil: entity.previousTokenGraceUntil,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
      matchType: entity.tokenHash === tokenHash ? ('current' as const) : ('previous' as const)
    };
  }
}

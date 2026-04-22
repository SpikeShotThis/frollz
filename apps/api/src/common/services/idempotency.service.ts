import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { DomainError } from '../../domain/errors.js';
import { IdempotencyKeyEntity, UserEntity } from '../../infrastructure/entities/index.js';

function nowIso(): string {
  return new Date().toISOString();
}

function requestHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('UNIQUE constraint failed');
}

@Injectable()
export class IdempotencyService {
  constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) { }

  async execute<T>(params: {
    userId: number;
    key: string | undefined;
    scope: string;
    requestPayload: unknown;
    handler: () => Promise<T>;
  }): Promise<T> {
    const normalizedKey = params.key?.trim();
    if (!normalizedKey) {
      return params.handler();
    }

    if (normalizedKey.length > 255) {
      throw new DomainError('VALIDATION_ERROR', 'Idempotency key must be 255 characters or fewer');
    }

    const hashedPayload = requestHash(params.requestPayload);

    return this.entityManager.transactional(async (transactionalEntityManager) => {
      const existing = await transactionalEntityManager.findOne(IdempotencyKeyEntity, {
        user: params.userId,
        scope: params.scope,
        key: normalizedKey
      });

      if (existing) {
        if (existing.requestHash !== hashedPayload) {
          throw new DomainError('CONFLICT', 'Idempotency key was already used with a different payload');
        }

        return existing.responseBody as T;
      }

      const response = await params.handler();

      try {
        const entry = transactionalEntityManager.create(IdempotencyKeyEntity, {
          user: transactionalEntityManager.getReference(UserEntity, params.userId),
          scope: params.scope,
          key: normalizedKey,
          requestHash: hashedPayload,
          responseBody: response,
          createdAt: nowIso()
        });
        transactionalEntityManager.persist(entry);
        await transactionalEntityManager.flush();
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        const concurrent = await transactionalEntityManager.findOneOrFail(IdempotencyKeyEntity, {
          user: params.userId,
          scope: params.scope,
          key: normalizedKey
        });

        if (concurrent.requestHash !== hashedPayload) {
          throw new DomainError('CONFLICT', 'Idempotency key was already used with a different payload');
        }

        return concurrent.responseBody as T;
      }

      return response;
    });
  }
}

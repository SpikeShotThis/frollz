import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/core';
import { DomainError } from '../../domain/errors.js';
import { IdempotencyKeyEntity, UserEntity } from '../../infrastructure/entities/index.js';
import { nowIso } from '../utils/time.js';

function idempotencyExpiresAt(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function requestHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

const PENDING_RESPONSE_BODY = { __frollzIdempotencyPending: true };
const RESPONSE_BODY_KEY = '__frollzIdempotencyResponse';

function wrapResponseBody(response: unknown): Record<string, unknown> {
  return { [RESPONSE_BODY_KEY]: response };
}

function unwrapResponseBody<T>(responseBody: unknown): T {
  if (responseBody && typeof responseBody === 'object' && RESPONSE_BODY_KEY in responseBody) {
    return (responseBody as Record<string, unknown>)[RESPONSE_BODY_KEY] as T;
  }

  return responseBody as T;
}

function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof UniqueConstraintViolationException) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes('UNIQUE constraint failed') || message.includes('duplicate key value violates unique constraint');
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
      throw new DomainError('VALIDATION_ERROR', 'Idempotency key must be 255 characters or fewer', { label: 'errors.idempotency.keyTooLong' });
    }

    const hashedPayload = requestHash(params.requestPayload);

    return this.entityManager.transactional(async (transactionalEntityManager) => {
      const now = nowIso();
      const existing = await transactionalEntityManager.findOne(IdempotencyKeyEntity, {
        user: params.userId,
        scope: params.scope,
        key: normalizedKey,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
      });

      if (existing) {
        if (existing.requestHash !== hashedPayload) {
          throw new DomainError('CONFLICT', 'Idempotency key was already used with a different payload', { label: 'errors.idempotency.keyConflict' });
        }

        return unwrapResponseBody<T>(existing.responseBody);
      }

      let entry: IdempotencyKeyEntity;

      try {
        entry = transactionalEntityManager.create(IdempotencyKeyEntity, {
          user: transactionalEntityManager.getReference(UserEntity, params.userId),
          scope: params.scope,
          key: normalizedKey,
          requestHash: hashedPayload,
          responseBody: PENDING_RESPONSE_BODY,
          createdAt: now,
          expiresAt: idempotencyExpiresAt()
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
          throw new DomainError('CONFLICT', 'Idempotency key was already used with a different payload', { label: 'errors.idempotency.keyConflict' });
        }

        return unwrapResponseBody<T>(concurrent.responseBody);
      }

      const response = await params.handler();
      entry.responseBody = wrapResponseBody(response);
      await transactionalEntityManager.flush();

      // Fire-and-forget: prune expired keys outside the transaction to avoid deadlocks
      this.entityManager.nativeDelete(IdempotencyKeyEntity, { expiresAt: { $lte: now } }).catch(() => {});

      return response;
    });
  }
}

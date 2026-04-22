import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';

const REDACTED_FIELDS = new Set(['password', 'passwordHash', 'refreshToken', 'accessToken', 'token', 'authorization', 'secret']);

function redactValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      REDACTED_FIELDS.has(key) ? '[REDACTED]' : redactValue(entryValue)
    ])
  );
}

function formatPayload(value: unknown): string {
  if (value === undefined) {
    return '';
  }

  return ` ${JSON.stringify(redactValue(value))}`;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): ReturnType<CallHandler['handle']> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url, body } = req;
    const start = Date.now();

    this.logger.log(`→ ${method} ${url}${formatPayload(body)}`);

    const obs = next.handle();
    obs.subscribe({
      next: (data: unknown) => {
        const reply = context.switchToHttp().getResponse<FastifyReply>();
        this.logger.log(`← ${method} ${url} ${reply.statusCode} (${Date.now() - start}ms)${formatPayload(data)}`);
      },
      error: (err: unknown) => {
        const status = (err as { status?: number })?.status ?? 500;
        this.logger.error(`← ${method} ${url} ${status} (${Date.now() - start}ms) ${String(err)}`);
      }
    });
    return obs;
  }
}

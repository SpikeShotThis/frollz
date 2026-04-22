import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DomainErrorFilter } from './common/filters/domain-error.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { requireAuthJwtSecret } from './modules/auth/auth.constants.js';

function parseAllowedOrigins(): string[] {
  const rawOrigins = process.env['ALLOWED_ORIGINS'];

  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap(): Promise<void> {
  requireAuthJwtSecret();

  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ bodyLimit: 1_048_576 }));
  app.setGlobalPrefix('api/v1');
  app.getHttpAdapter().getInstance().addHook('onSend', (_request: unknown, reply: { getHeader(name: string): unknown }, payload: unknown, done: (err: Error | null, payload?: unknown) => void) => {
    const contentType = reply.getHeader('content-type');
    if (typeof contentType !== 'string' || !contentType.includes('application/json')) {
      done(null, payload);
      return;
    }

    if (typeof payload !== 'string') {
      done(null, payload);
      return;
    }

    try {
      const body = JSON.parse(payload) as Record<string, unknown> | null;
      if (body && typeof body === 'object' && ('error' in body || ('data' in body && 'meta' in body))) {
        done(null, payload);
        return;
      }

      done(null, JSON.stringify({ data: body ?? null, meta: {} }));
    } catch {
      done(null, payload);
    }
  });
  const allowedOrigins = parseAllowedOrigins();
  app.enableCors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false });
  app.useGlobalFilters(new DomainErrorFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (process.env['NODE_ENV'] !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Analog Film Tracker API')
      .setDescription('API documentation for the Analog Film Tracker service')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(3000, '0.0.0.0');
}

void bootstrap();

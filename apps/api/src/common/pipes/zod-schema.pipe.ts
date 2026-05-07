import type { PipeTransform } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';
import { DomainError } from '../../domain/errors.js';

@Injectable()
export class ZodSchemaPipe<TSchema extends ZodTypeAny> implements PipeTransform<unknown, TSchema['_output']> {
  constructor(private readonly schema: TSchema) { }

  transform(value: unknown): TSchema['_output'] {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new DomainError('VALIDATION_ERROR', 'Validation failed', { label: 'errors.validation.failed', details: [result.error.flatten()] });
    }

    return result.data;
  }
}

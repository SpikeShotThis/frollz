import type { PipeTransform } from '@nestjs/common';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

@Injectable()
export class ZodSchemaPipe<TSchema extends ZodTypeAny> implements PipeTransform<unknown, TSchema['_output']> {
  constructor(private readonly schema: TSchema) { }

  transform(value: unknown): TSchema['_output'] {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: result.error.flatten()
      });
    }

    return result.data;
  }
}

import { describe, expect, it } from 'vitest';
import { createFilmLabRequestSchema, updateFilmLabRequestSchema } from '@frollz2/schema';

describe('film lab schemas', () => {
  it('accepts create payload with optional fields omitted', () => {
    expect(createFilmLabRequestSchema.parse({ name: 'Indie Film Lab' })).toMatchObject({
      name: 'Indie Film Lab'
    });
  });

  it('rejects out-of-range ratings', () => {
    expect(() => createFilmLabRequestSchema.parse({ name: 'Lab', rating: 7 })).toThrow();
    expect(() => updateFilmLabRequestSchema.parse({ rating: 0 })).toThrow();
  });
});

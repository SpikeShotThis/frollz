import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { useZodForm } from './useZodForm.js';

describe('useZodForm', () => {
  it('returns parsed values and clears errors for valid input', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8)
    });

    const form = useZodForm(schema, {
      email: 'demo@example.com',
      password: 'password123'
    });

    const parsed = form.validate();

    expect(parsed).toEqual({
      email: 'demo@example.com',
      password: 'password123'
    });
    expect(form.errors.value).toEqual([]);
  });

  it('collects validation errors and returns null for invalid input', () => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8)
    });

    const form = useZodForm(schema, {
      email: 'not-an-email',
      password: 'short'
    });

    const parsed = form.validate();

    expect(parsed).toBeNull();
    expect(form.errors.value.length).toBeGreaterThan(0);
  });
});

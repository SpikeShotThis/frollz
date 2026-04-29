import { describe, expect, it } from 'vitest';
import { normalizeReferenceValue, sanitizeReferenceValue } from '../reference/reference-value.utils.js';

describe('reference value normalization', () => {
  it('normalizes case and internal whitespace for dedupe', () => {
    expect(normalizeReferenceValue('  KODAK   Portra  ')).toBe('kodak portra');
  });

  it('preserves display casing while trimming/collapsing whitespace', () => {
    expect(sanitizeReferenceValue('  Kodak   Portra  ')).toBe('Kodak Portra');
  });
});

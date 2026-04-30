import { describe, expect, it } from 'vitest';
import { allocateCostForFilm } from '../film/cost-allocation.js';

describe('allocateCostForFilm', () => {
  it('splits evenly for divisible totals', () => {
    expect(allocateCostForFilm(12, 3, 1)).toBe(4);
    expect(allocateCostForFilm(12, 3, 2)).toBe(4);
    expect(allocateCostForFilm(12, 3, 3)).toBe(4);
  });

  it('distributes remainder deterministically', () => {
    const amounts = [1, 2, 3].map((id) => allocateCostForFilm(10, 3, id));
    expect(amounts).toEqual([3.34, 3.33, 3.33]);
    expect(amounts.reduce((sum, value) => sum + value, 0)).toBe(10);
  });

  it('handles zero totals', () => {
    expect(allocateCostForFilm(0, 3, 1)).toBe(0);
  });
});

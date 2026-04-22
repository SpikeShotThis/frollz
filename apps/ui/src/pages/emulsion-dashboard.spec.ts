import { describe, expect, it } from 'vitest';
import type { Emulsion } from '@frollz2/schema';
import {
  buildEmulsionKpis,
  filterAndSortEmulsionsForChildTable,
  filterEmulsionsByProcessCode
} from './emulsion-dashboard.js';

function makeEmulsion(input: Partial<Emulsion> & Pick<Emulsion, 'id' | 'manufacturer' | 'brand'>): Emulsion {
  return {
    id: input.id,
    manufacturer: input.manufacturer,
    brand: input.brand,
    isoSpeed: input.isoSpeed ?? 400,
    developmentProcessId: input.developmentProcessId ?? 1,
    developmentProcess: input.developmentProcess ?? { id: 1, code: 'C41', label: 'C-41' },
    balance: input.balance ?? 'Daylight',
    filmFormats: input.filmFormats ?? [{ id: 1, code: '35mm', label: '35mm' }]
  };
}

describe('emulsion-dashboard helpers', () => {
  it('filters emulsions by development process code', () => {
    const emulsions = [
      makeEmulsion({ id: 1, manufacturer: 'Kodak', brand: 'Gold', developmentProcess: { id: 1, code: 'C41', label: 'C-41' } }),
      makeEmulsion({ id: 2, manufacturer: 'Ilford', brand: 'HP5', developmentProcess: { id: 2, code: 'BW', label: 'Black and White' } })
    ];

    expect(filterEmulsionsByProcessCode(emulsions, 'BW').map((entry) => entry.id)).toEqual([2]);
    expect(filterEmulsionsByProcessCode(emulsions, null).map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('applies search and sorts by manufacturer-brand label', () => {
    const emulsions = [
      makeEmulsion({ id: 1, manufacturer: 'Kodak', brand: 'Gold', isoSpeed: 200 }),
      makeEmulsion({ id: 2, manufacturer: 'Ilford', brand: 'HP5', isoSpeed: 400 }),
      makeEmulsion({ id: 3, manufacturer: 'Fuji', brand: 'Provia', isoSpeed: 100 })
    ];

    const filtered = filterAndSortEmulsionsForChildTable(emulsions, '400');
    expect(filtered.map((entry) => entry.id)).toEqual([2]);

    const sorted = filterAndSortEmulsionsForChildTable(emulsions, '');
    expect(sorted.map((entry) => entry.id)).toEqual([3, 2, 1]);
  });

  it('builds KPI cards for visible emulsion slice', () => {
    const emulsions = [
      makeEmulsion({ id: 1, manufacturer: 'Kodak', brand: 'Gold', isoSpeed: 200, filmFormats: [{ id: 1, code: '35mm', label: '35mm' }] }),
      makeEmulsion({ id: 2, manufacturer: 'Kodak', brand: 'Portra', isoSpeed: 400, filmFormats: [{ id: 2, code: '120', label: '120' }] }),
      makeEmulsion({ id: 3, manufacturer: 'Ilford', brand: 'HP5', isoSpeed: 400, filmFormats: [{ id: 1, code: '35mm', label: '35mm' }] })
    ];

    expect(buildEmulsionKpis(emulsions)).toEqual([
      { label: 'Total visible emulsions', value: 3, helper: 'Current route scope' },
      { label: 'Unique manufacturers', value: 2, helper: 'Distinct brands in view' },
      { label: 'Average ISO', value: 333, helper: 'Rounded to nearest whole ISO' },
      { label: 'Format coverage', value: 2, helper: 'Unique compatible film formats' }
    ]);
  });
});
